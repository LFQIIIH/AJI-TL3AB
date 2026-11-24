-- Gamification: monthly challenges (bonus points), personal match card and
-- recap, and push notifications (subscriptions, what is due, scheduler).

-- ───────────────────────── monthly challenges ─────────────────────────

-- 3 challenges a month, rotating automatically (no admin work):
-- slot 1 = playing, slot 2 = attacking, slot 3 = winning / giving feedback.
create or replace function public.month_challenges(p_month date)
returns table (slot integer, metric text, target integer, points integer, title text)
language sql
immutable
set search_path = ''
as $$
  with k as (select (extract(year from p_month)::integer * 12 + extract(month from p_month)::integer) as n)
  select 1, (array['matches','weeks','matches'])[k.n % 3 + 1], (array[4,3,6])[k.n % 3 + 1], (array[20,15,30])[k.n % 3 + 1],
         (array['Joue 4 matchs ce mois','Joue 3 semaines différentes','Joue 6 matchs ce mois'])[k.n % 3 + 1] from k
  union all
  select 2, (array['goals','assists','scored_in'])[k.n % 3 + 1], (array[3,3,2])[k.n % 3 + 1], 15,
         (array['Marque 3 buts','Fais 3 passes décisives','Marque dans 2 matchs différents'])[k.n % 3 + 1] from k
  union all
  select 3, (array['wins','feedback'])[k.n % 2 + 1], 2, (array[15,10])[k.n % 2 + 1],
         (array['Gagne 2 matchs','Donne ton avis sur 2 matchs'])[k.n % 2 + 1] from k
$$;
grant execute on function public.month_challenges(date) to anon, authenticated;

drop function if exists public.player_points(date, date);
create function public.player_points(p_from date, p_to date)
returns table (
  user_id uuid, points integer, matches integer, wins integer, draws integer, goals integer, assists integer,
  awards integer, streak_bonus integer, feedback integer, yellow integer, red integer, late_cancels integer,
  challenge_bonus integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with played as (
    select b.user_id, b.match_id, b.match_date, b.goals, b.assists, b.team, m.home_score, m.away_score
    from public.bookings b
    left join public.matches m on m.id = b.match_id
    where b.attended and b.match_start < now() and b.match_date between p_from and p_to
      and coalesce(m.status, 'published') <> 'cancelled'
  ),
  base as (
    select p.user_id,
           count(*)::integer as matches,
           count(*) filter (where (p.team = 'home' and p.home_score > p.away_score) or (p.team = 'away' and p.away_score > p.home_score))::integer as wins,
           count(*) filter (where p.team is not null and p.home_score = p.away_score)::integer as draws,
           coalesce(sum(p.goals), 0)::integer as goals,
           coalesce(sum(p.assists), 0)::integer as assists
    from played p
    group by p.user_id
  ),
  -- Elected players (best goalkeeper / defender / midfielder) once voting is closed.
  vote_totals as (
    select v.match_id, v.category, v.candidate_id, count(*) as n
    from public.votes v
    where v.match_date between p_from and p_to
      and exists (select 1 from public.bookings b where b.match_id = v.match_id and now() > b.match_start + interval '49 hours')
    group by 1, 2, 3
  ),
  awards as (
    select candidate_id as user_id, count(*)::integer as awards
    from (select *, rank() over (partition by match_id, category order by n desc) as r from vote_totals) t
    where r = 1
    group by 1
  ),
  -- Weeks in a row with a match (all history, so a run started before p_from counts),
  -- +bonus on every 4th week of a run that falls inside the period.
  weeks as (
    select distinct b.user_id, date_trunc('week', b.match_date)::date as wk
    from public.bookings b
    where b.attended and b.match_start < now() and b.match_date <= p_to
  ),
  runs as (
    select user_id, wk, wk - (row_number() over (partition by user_id order by wk) * 7)::integer as grp from weeks
  ),
  numbered as (
    select user_id, wk, row_number() over (partition by user_id, grp order by wk) as k from runs
  ),
  streaks as (
    select user_id, count(*)::integer as bonus_weeks
    from numbered
    where k % 4 = 0 and wk + 6 >= p_from and wk <= p_to
    group by 1
  ),
  feedback as (
    select f.user_id, count(*)::integer as n
    from public.match_feedback f
    join public.matches m on m.id = f.match_id
    where (m.starts_at at time zone 'Africa/Casablanca')::date between p_from and p_to
    group by 1
  ),
  cards as (
    select e.user_id,
           count(*) filter (where e.kind = 'yellow')::integer as yellow,
           count(*) filter (where e.kind = 'red')::integer as red
    from public.match_events e
    join public.matches m on m.id = e.match_id
    where e.user_id is not null and e.kind in ('yellow', 'red')
      and (m.starts_at at time zone 'Africa/Casablanca')::date between p_from and p_to
    group by 1
  ),
  late as (
    select l.user_id, count(*)::integer as n from public.late_cancellations l where l.match_date between p_from and p_to group by 1
  ),
  -- Monthly challenges ("Défis du mois"): per player and month, the challenge
  -- metrics over the part of the month inside the period.
  month_stats as (
    select p.user_id, date_trunc('month', p.match_date)::date as m,
           count(*)::integer as matches,
           count(distinct date_trunc('week', p.match_date))::integer as weeks,
           coalesce(sum(p.goals), 0)::integer as goals,
           coalesce(sum(p.assists), 0)::integer as assists,
           count(*) filter (where (p.team = 'home' and p.home_score > p.away_score) or (p.team = 'away' and p.away_score > p.home_score))::integer as wins,
           count(*) filter (where p.goals > 0)::integer as scored_in
    from played p
    group by 1, 2
  ),
  month_feedback as (
    select f.user_id, date_trunc('month', (m.starts_at at time zone 'Africa/Casablanca'))::date as m, count(*)::integer as n
    from public.match_feedback f
    join public.matches m on m.id = f.match_id
    where (m.starts_at at time zone 'Africa/Casablanca')::date between p_from and p_to
    group by 1, 2
  ),
  challenge_done as (
    select s.user_id, sum(c.points)::integer as bonus
    from month_stats s
    left join month_feedback mf on mf.user_id = s.user_id and mf.m = s.m
    cross join lateral public.month_challenges(s.m) c
    where case c.metric
            when 'matches' then s.matches
            when 'weeks' then s.weeks
            when 'goals' then s.goals
            when 'assists' then s.assists
            when 'wins' then s.wins
            when 'scored_in' then s.scored_in
            when 'feedback' then coalesce(mf.n, 0)
            else 0
          end >= c.target
    group by 1
  ),
  everyone as (
    select user_id from base union select user_id from awards union select user_id from streaks
    union select user_id from feedback union select user_id from cards union select user_id from late
  )
  select e.user_id,
         ( coalesce(b.matches, 0) * public.points_rule('played')
         + coalesce(b.wins, 0) * public.points_rule('win')
         + coalesce(b.draws, 0) * public.points_rule('draw')
         + coalesce(b.goals, 0) * public.points_rule('goal')
         + coalesce(b.assists, 0) * public.points_rule('assist')
         + coalesce(a.awards, 0) * public.points_rule('award')
         + coalesce(s.bonus_weeks, 0) * public.points_rule('streak4')
         + coalesce(f.n, 0) * public.points_rule('feedback')
         + coalesce(c.yellow, 0) * public.points_rule('yellow')
         + coalesce(c.red, 0) * public.points_rule('red')
         + coalesce(l.n, 0) * public.points_rule('late_cancel')
         + coalesce(cd.bonus, 0))::integer,
         coalesce(b.matches, 0), coalesce(b.wins, 0), coalesce(b.draws, 0), coalesce(b.goals, 0), coalesce(b.assists, 0),
         coalesce(a.awards, 0), coalesce(s.bonus_weeks, 0), coalesce(f.n, 0), coalesce(c.yellow, 0), coalesce(c.red, 0), coalesce(l.n, 0),
         coalesce(cd.bonus, 0)
  from everyone e
  left join base b on b.user_id = e.user_id
  left join awards a on a.user_id = e.user_id
  left join streaks s on s.user_id = e.user_id
  left join feedback f on f.user_id = e.user_id
  left join cards c on c.user_id = e.user_id
  left join late l on l.user_id = e.user_id
  left join challenge_done cd on cd.user_id = e.user_id
$$;

revoke all on function public.player_points(date, date) from public, anon, authenticated;

-- The signed-in player's challenges this month, with progress.
create or replace function public.my_challenges()
returns table (slot integer, title text, metric text, target integer, points integer, progress integer, done boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with b as (
    select date_trunc('month', public.marrakech_today())::date as m_from, public.marrakech_today() as m_to
  ),
  played as (
    select bk.match_date, bk.goals, bk.assists, bk.team, m.home_score, m.away_score
    from b
    join public.bookings bk on bk.user_id = auth.uid() and bk.attended and bk.match_start < now()
      and bk.match_date between b.m_from and b.m_to
    left join public.matches m on m.id = bk.match_id
    where coalesce(m.status, 'published') <> 'cancelled'
  ),
  s as (
    select count(*)::integer as matches,
           count(distinct date_trunc('week', match_date))::integer as weeks,
           coalesce(sum(goals), 0)::integer as goals,
           coalesce(sum(assists), 0)::integer as assists,
           count(*) filter (where (team = 'home' and home_score > away_score) or (team = 'away' and away_score > home_score))::integer as wins,
           count(*) filter (where goals > 0)::integer as scored_in,
           (select count(*)::integer from public.match_feedback f join public.matches m on m.id = f.match_id, b
             where f.user_id = auth.uid() and (m.starts_at at time zone 'Africa/Casablanca')::date between b.m_from and b.m_to) as feedback
    from played
  )
  select c.slot, c.title, c.metric, c.target, c.points,
         least(c.target, case c.metric when 'matches' then s.matches when 'weeks' then s.weeks when 'goals' then s.goals
           when 'assists' then s.assists when 'wins' then s.wins when 'scored_in' then s.scored_in when 'feedback' then s.feedback else 0 end),
         case c.metric when 'matches' then s.matches when 'weeks' then s.weeks when 'goals' then s.goals
           when 'assists' then s.assists when 'wins' then s.wins when 'scored_in' then s.scored_in when 'feedback' then s.feedback else 0 end >= c.target
  from s, b, public.month_challenges(b.m_from) c
  where auth.uid() is not null
  order by c.slot
$$;
revoke all on function public.my_challenges() from public, anon;
grant execute on function public.my_challenges() to authenticated;

-- my_progress: + challenge bonus in the monthly breakdown.
create or replace function public.my_progress()
returns table (points_total integer, points_month integer, rank_month integer, code text, public_profile boolean, breakdown jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select * from public.profiles where id = auth.uid()),
  total as (select pp.* from public.player_points('2000-01-01', public.marrakech_today()) pp where pp.user_id = auth.uid()),
  month_all as (
    select pp.*, rank() over (order by pp.points desc)::integer as rk
    from public.player_points(date_trunc('month', public.marrakech_today())::date, public.marrakech_today()) pp
    where pp.matches > 0
  ),
  mm as (select * from month_all where user_id = auth.uid())
  select coalesce(t.points, 0), coalesce(mm.points, 0), mm.rk, me.public_code, me.public_profile,
         jsonb_build_object('matches', coalesce(mm.matches, 0), 'wins', coalesce(mm.wins, 0), 'draws', coalesce(mm.draws, 0),
                            'goals', coalesce(mm.goals, 0), 'assists', coalesce(mm.assists, 0), 'awards', coalesce(mm.awards, 0),
                            'streak_bonus', coalesce(mm.streak_bonus, 0), 'feedback', coalesce(mm.feedback, 0),
                            'yellow', coalesce(mm.yellow, 0), 'red', coalesce(mm.red, 0), 'late_cancels', coalesce(mm.late_cancels, 0),
                            'challenges', coalesce(mm.challenge_bonus, 0))
  from me
  left join total t on true
  left join mm on true
$$;

-- ───────────────────────── personal match card + recap ─────────────────────────

-- One played match seen by the signed-in player: result, own stats and the
-- points this match earned (same table as player_points).
create or replace function public.my_match_card(p_match_id text)
returns table (
  match_id text, starts_at timestamptz, pitch text, home_name text, away_name text, home_score integer, away_score integer,
  team text, result text, goals integer, assists integer, yellow integer, red integer, awards text[],
  points integer, name text, avatar text, code text, public_profile boolean, month_points integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with bk as (
    select b.* from public.bookings b
    where b.match_id = p_match_id and b.user_id = auth.uid() and b.attended and b.match_start < now()
  ),
  m as (
    select mt.*, pt.name as pitch_name from public.matches mt left join public.pitches pt on pt.id = mt.pitch_id where mt.id = p_match_id
  ),
  ev as (
    select count(*) filter (where e.kind = 'yellow')::integer as yellow, count(*) filter (where e.kind = 'red')::integer as red
    from public.match_events e where e.match_id = p_match_id and e.user_id = auth.uid()
  ),
  aw as (
    select coalesce(array_agg(w.category order by w.category) filter (where w.category <> 'buteur'), '{}') as cats
    from public.match_award_winners(array[p_match_id]) w where w.user_id = auth.uid()
  ),
  r as (
    select case
      when bk.team is null or m.home_score is null or m.away_score is null then null
      when (case when bk.team = 'home' then m.home_score - m.away_score else m.away_score - m.home_score end) > 0 then 'V'
      when m.home_score = m.away_score then 'N' else 'D' end as res
    from bk, m
  )
  select m.id, m.starts_at, m.pitch_name, coalesce(m.home_name, 'Équipe 1'), coalesce(m.away_name, 'Équipe 2'), m.home_score, m.away_score,
         bk.team, r.res, bk.goals::integer, coalesce(bk.assists, 0)::integer, ev.yellow, ev.red, aw.cats,
         ( public.points_rule('played')
         + case r.res when 'V' then public.points_rule('win') when 'N' then public.points_rule('draw') else 0 end
         + bk.goals * public.points_rule('goal') + coalesce(bk.assists, 0) * public.points_rule('assist')
         + cardinality(aw.cats) * public.points_rule('award')
         + ev.yellow * public.points_rule('yellow') + ev.red * public.points_rule('red'))::integer,
         public.public_name(p.full_name), p.avatar_path, p.public_code, p.public_profile,
         coalesce((select pp.points from public.player_points(date_trunc('month', public.marrakech_today())::date, public.marrakech_today()) pp
                   where pp.user_id = auth.uid()), 0)
  from bk, m, ev, aw, r, public.profiles p
  where p.id = auth.uid()
$$;
revoke all on function public.my_match_card(text) from public, anon;
grant execute on function public.my_match_card(text) to authenticated;

-- Latest match the player played in the last 10 days that has a score (for the recap).
create or replace function public.my_last_match()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select b.match_id from public.bookings b join public.matches m on m.id = b.match_id
  where b.user_id = auth.uid() and b.attended and m.home_score is not null and m.away_score is not null
    and b.match_start between now() - interval '10 days' and now() - interval '1 hour'
  order by b.match_start desc limit 1
$$;
revoke all on function public.my_last_match() from public, anon;
grant execute on function public.my_last_match() to authenticated;

-- ───────────────────────── push notifications ─────────────────────────

-- Server-side settings (VAPID keys, dispatcher key). No access for players or visitors.
create table if not exists public.app_settings (key text primary key, value text not null);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
insert into public.app_settings (key, value) values ('dispatch_key', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

create or replace function public.vapid_public_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select value from public.app_settings where key = 'vapid_public' $$;
grant execute on function public.vapid_public_key() to anon, authenticated;

create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;
drop policy if exists "push: read own" on public.push_subscriptions;
create policy "push: read own" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));

-- Save this phone / browser for the signed-in player (a browser belongs to whoever signed in last).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile_missing';
  end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'invalid_subscription';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (auth.uid(), p_endpoint, p_p256dh, p_auth);
  -- At most 5 devices per player.
  delete from public.push_subscriptions where user_id = auth.uid() and id not in (
    select id from public.push_subscriptions where user_id = auth.uid() order by id desc limit 5);
end;
$$;
revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$ delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid() $$;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.delete_push_subscription(text) to authenticated;

-- What was sent (never twice) and which matches were already announced.
create table if not exists public.push_log (
  kind text not null, ref text not null, user_id uuid not null, sent_at timestamptz not null default now(),
  primary key (kind, ref, user_id)
);
alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;
create table if not exists public.push_announced (match_id text primary key, announced_at timestamptz not null default now());
alter table public.push_announced enable row level security;
revoke all on public.push_announced from anon, authenticated;
-- Don't announce what is already online today.
insert into public.push_announced (match_id) select id from public.matches on conflict do nothing;

-- Takes everything due now (and records it), for the dispatcher (service role only).
create or replace function public.push_take_due()
returns table (user_id uuid, title text, body text, url text, tag text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  fresh integer;
  week_start date := date_trunc('week', public.marrakech_today())::date;
  local_now timestamp := now() at time zone 'Africa/Casablanca';
begin
  -- 1. New matches online (one message per run, however many matches).
  with visible as (
    select m.id from public.matches m
    where m.status = 'published' and m.starts_at > now() and (m.publish_at is null or m.publish_at <= now())
      and not exists (select 1 from public.push_announced a where a.match_id = m.id)
  ), ins as (insert into public.push_announced (match_id) select id from visible on conflict do nothing returning 1)
  select count(*) into fresh from ins;
  if fresh > 0 then
    return query
      select distinct s.user_id,
             case when fresh = 1 then '⚽ Nouveau match dispo' else format('⚽ %s nouveaux matchs dispo', fresh) end,
             'Réserve vite ta place sur AJI TL3AB.'::text, '/jouer'::text, 'new-matches'::text
      from public.push_subscriptions s;
  end if;

  -- 2. Match card ready (score entered), 3. vote open (1 h after kick-off).
  return query
    with due as (
      select b.user_id, 'card'::text as kind, b.match_id as ref
      from public.bookings b join public.matches m on m.id = b.match_id
      where b.attended and m.home_score is not null and m.away_score is not null
        and b.match_start between now() - interval '3 days' and now() - interval '1 hour'
      union all
      select b.user_id, 'vote', b.match_id
      from public.bookings b
      where b.attended and b.match_start between now() - interval '3 hours' and now() - interval '1 hour'
    ), fresh_due as (
      insert into public.push_log (kind, ref, user_id)
      select d.kind, d.ref, d.user_id from due d
      where exists (select 1 from public.push_subscriptions s where s.user_id = d.user_id)
      on conflict do nothing
      returning push_log.kind, push_log.ref, push_log.user_id
    )
    select f.user_id,
           case f.kind when 'card' then '📸 Ta carte du match est prête' else '🗳️ Vote ouvert : qui a brillé ?' end,
           case f.kind when 'card' then 'Score, points gagnés, niveau : regarde et partage-la.' else 'Élis le meilleur gardien, défenseur et milieu de ton match.' end,
           case f.kind when 'card' then '/compte?recap=' || f.ref else '/compte' end,
           f.kind || '-' || f.ref
    from fresh_due f;

  -- 4. Thursday from 18:00: weekly streak at stake (no match booked this week yet).
  if extract(isodow from local_now) = 4 and extract(hour from local_now) >= 18 then
    return query
      with due as (
        select distinct s.user_id, public.week_streak(s.user_id) as streak
        from public.push_subscriptions s
        where not exists (select 1 from public.bookings b where b.user_id = s.user_id and b.match_date >= week_start)
      ), fresh_due as (
        insert into public.push_log (kind, ref, user_id)
        select 'streak', week_start::text, d.user_id from due d where d.streak >= 2
        on conflict do nothing
        returning push_log.user_id
      )
      select f.user_id, format('🔥 Ta série de %s semaines est en jeu', public.week_streak(f.user_id)),
             'Réserve un match cette semaine pour la garder.'::text, '/jouer'::text, 'streak'::text
      from fresh_due f;
  end if;
end;
$$;
revoke all on function public.push_take_due() from public, anon, authenticated;
