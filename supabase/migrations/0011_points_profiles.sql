-- Phase 4: points, levels / monthly tiers (computed in the app from points),
-- streak bonus, public player profiles and player search.
--
-- Points are computed from what already happened (bookings, results, events,
-- votes, feedback, late cancellations): nothing to keep in sync, and a fix to
-- a score or an event fixes the points too. The table lives in points_rule().

-- ───────────────────────── points table ─────────────────────────

create or replace function public.points_rule(p_key text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_key
    when 'played'      then 10   -- match played (marked present)
    when 'win'         then 5    -- team won (team set in the live screen)
    when 'draw'        then 2
    when 'goal'        then 3
    when 'assist'      then 2
    when 'award'       then 5    -- elected best goalkeeper / defender / midfielder
    when 'streak4'     then 10   -- every 4th week in a row with a match
    when 'feedback'    then 1    -- "Ton avis sur le match" sent
    when 'yellow'      then -3
    when 'red'         then -10
    when 'late_cancel' then -5   -- cancelled less than 24 h before kick-off
    else 0
  end
$$;
grant execute on function public.points_rule(text) to anon, authenticated;

-- ───────────────────────── late cancellations ─────────────────────────

create table if not exists public.late_cancellations (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  match_id   text not null,
  match_date date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, match_id, created_at)
);
alter table public.late_cancellations enable row level security;
revoke all on public.late_cancellations from anon, authenticated;

-- Same as 0008, plus the late-cancellation log.
create or replace function public.cancel_booking(p_match_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  b public.bookings;
  refund integer;
  late boolean;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.bookings
  where match_id = p_match_id and user_id = uid and match_start > now()
  returning * into b;
  if not found then
    raise exception 'no_booking';
  end if;

  late := now() > b.match_start - make_interval(hours => public.full_refund_hours());
  if late then
    insert into public.late_cancellations (user_id, match_id, match_date) values (uid, p_match_id, b.match_date);
  end if;

  if coalesce(b.paid_mad, 0) > 0 then
    refund := case when not late then b.paid_mad else b.paid_mad / 2 end;
    if refund > 0 then
      insert into public.wallet_transactions (user_id, amount_mad, kind, match_id, note)
      values (uid, refund, 'refund', p_match_id,
              case when refund = b.paid_mad then 'Annulation (remboursement 100 %)' else 'Annulation tardive (remboursement 50 %)' end);
    end if;
  end if;

  return public.promote_waitlist(p_match_id, 1 + b.guests);
end;
$$;

-- ───────────────────────── public profile settings ─────────────────────────

create or replace function public.new_public_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where public_code = code);
  end loop;
  return code;
end;
$$;
revoke all on function public.new_public_code() from public, anon, authenticated;

alter table public.profiles add column if not exists public_profile boolean not null default true;
alter table public.profiles add column if not exists public_code text;
update public.profiles set public_code = public.new_public_code() where public_code is null;
alter table public.profiles alter column public_code set default public.new_public_code();
alter table public.profiles alter column public_code set not null;
do $$ begin
  alter table public.profiles add constraint profiles_public_code_key unique (public_code);
exception when duplicate_table or duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_public_code_format check (public_code ~ '^[a-z0-9]{6,12}$');
exception when duplicate_object then null; end $$;

-- ───────────────────────── points per player ─────────────────────────

-- Internal: points of every player for matches played between two dates.
create or replace function public.player_points(p_from date, p_to date)
returns table (
  user_id uuid, points integer, matches integer, wins integer, draws integer, goals integer, assists integer,
  awards integer, streak_bonus integer, feedback integer, yellow integer, red integer, late_cancels integer
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
         + coalesce(l.n, 0) * public.points_rule('late_cancel'))::integer,
         coalesce(b.matches, 0), coalesce(b.wins, 0), coalesce(b.draws, 0), coalesce(b.goals, 0), coalesce(b.assists, 0),
         coalesce(a.awards, 0), coalesce(s.bonus_weeks, 0), coalesce(f.n, 0), coalesce(c.yellow, 0), coalesce(c.red, 0), coalesce(l.n, 0)
  from everyone e
  left join base b on b.user_id = e.user_id
  left join awards a on a.user_id = e.user_id
  left join streaks s on s.user_id = e.user_id
  left join feedback f on f.user_id = e.user_id
  left join cards c on c.user_id = e.user_id
  left join late l on l.user_id = e.user_id
$$;
revoke all on function public.player_points(date, date) from public, anon, authenticated;

-- Current run of weeks in a row with a match (this week, or up to last week).
create or replace function public.week_streak(p_user uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  streak integer := 0;
  wk date := date_trunc('week', public.marrakech_today())::date;
begin
  if not exists (select 1 from public.bookings b where b.user_id = p_user and b.attended and b.match_start < now()
                 and date_trunc('week', b.match_date)::date = wk) then
    wk := wk - 7;
  end if;
  while exists (select 1 from public.bookings b where b.user_id = p_user and b.attended and b.match_start < now()
                and date_trunc('week', b.match_date)::date = wk) loop
    streak := streak + 1;
    wk := wk - 7;
  end loop;
  return streak;
end;
$$;
revoke all on function public.week_streak(uuid) from public, anon, authenticated;

-- ───────────────────────── public functions ─────────────────────────

-- Monthly points ranking. `code` is null for hidden profiles (no link).
create or replace function public.points_leaderboard(p_month date, p_limit integer default 20)
returns table (rank integer, name text, code text, player_position text, points integer, matches integer, goals integer, assists integer)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by pp.points desc)::integer, public.public_name(p.full_name),
         case when p.public_profile then p.public_code end, p.position, pp.points, pp.matches, pp.goals, pp.assists
  from public.player_points(date_trunc('month', p_month)::date, (date_trunc('month', p_month) + interval '1 month - 1 day')::date) pp
  join public.profiles p on p.id = pp.user_id
  where pp.matches > 0
  order by pp.points desc, pp.matches desc, p.full_name
  limit least(greatest(p_limit, 1), 100)
$$;
revoke all on function public.points_leaderboard(date, integer) from public;
grant execute on function public.points_leaderboard(date, integer) to anon, authenticated;

-- A player's public page. Nothing if the profile is hidden. Never phone, email or birth date.
create or replace function public.player_profile(p_code text)
returns table (
  code text, name text, player_position text, member_since date,
  points_total integer, points_month integer, rank_month integer,
  matches integer, wins integer, goals integer, assists integer, awards integer,
  best_match_goals integer, week_streak integer, yellow integer, red integer,
  referrals_played integer, recent jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with p as (
    select * from public.profiles where public_code = lower(p_code) and public_profile
  ),
  total as (select pp.* from p, public.player_points('2000-01-01', public.marrakech_today()) pp where pp.user_id = p.id),
  month_all as (
    select pp.user_id, pp.points, rank() over (order by pp.points desc)::integer as rk
    from public.player_points(date_trunc('month', public.marrakech_today())::date, public.marrakech_today()) pp
    where pp.matches > 0
  ),
  recent as (
    select jsonb_agg(jsonb_build_object(
             'match_id', r.match_id, 'date', r.match_date, 'goals', r.goals, 'assists', r.assists, 'team', r.team,
             'home_name', r.home_name, 'away_name', r.away_name, 'home_score', r.home_score, 'away_score', r.away_score
           ) order by r.match_start desc) as items
    from (
      select b.match_id, b.match_date, b.match_start, b.goals, b.assists, b.team, m.home_name, m.away_name, m.home_score, m.away_score
      from p join public.bookings b on b.user_id = p.id
      left join public.matches m on m.id = b.match_id
      where b.attended and b.match_start < now()
      order by b.match_start desc
      limit 8
    ) r
  )
  select p.public_code, public.public_name(p.full_name), p.position, (p.created_at at time zone 'Africa/Casablanca')::date,
         coalesce(t.points, 0), coalesce(ma.points, 0), ma.rk,
         coalesce(t.matches, 0), coalesce(t.wins, 0), coalesce(t.goals, 0), coalesce(t.assists, 0),
         (select count(*)::integer from public.match_award_winners(
            coalesce((select array_agg(b.match_id) from public.bookings b where b.user_id = p.id and b.attended), '{}')) w
          where w.user_id = p.id),
         (select coalesce(max(b.goals), 0)::integer from public.bookings b where b.user_id = p.id and b.attended and b.match_start < now()),
         public.week_streak(p.id), coalesce(t.yellow, 0), coalesce(t.red, 0),
         (select count(*)::integer from public.profiles f where f.referred_by = p.id
            and exists (select 1 from public.bookings b where b.user_id = f.id and b.attended and b.match_start < now())),
         coalesce((select items from recent), '[]'::jsonb)
  from p
  left join total t on true
  left join month_all ma on ma.user_id = p.id
$$;
revoke all on function public.player_profile(text) from public;
grant execute on function public.player_profile(text) to anon, authenticated;

-- Player search by name (public profiles of people who have played at least once).
create or replace function public.search_players(p_query text)
returns table (code text, name text, player_position text, matches integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.public_code, public.public_name(p.full_name), p.position,
         (select count(*)::integer from public.bookings b where b.user_id = p.id and b.attended and b.match_start < now())
  from public.profiles p
  where p.public_profile
    and length(btrim(coalesce(p_query, ''))) >= 2
    and public.public_name(p.full_name) ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    and exists (select 1 from public.bookings b where b.user_id = p.id and b.attended and b.match_start < now())
  order by 4 desc, 2
  limit 20
$$;
revoke all on function public.search_players(text) from public;
grant execute on function public.search_players(text) to anon, authenticated;

-- Players of a played match with their profile code (null if hidden), for links on /match/….
create or replace function public.public_match_roster(p_match_id text)
returns table (name text, code text, team text, goals integer, assists integer)
language sql
stable
security definer
set search_path = ''
as $$
  select public.public_name(p.full_name), case when p.public_profile then p.public_code end, b.team, b.goals::integer, b.assists::integer
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  join public.matches m on m.id = b.match_id
  where b.match_id = p_match_id and b.attended and m.status = 'published' and m.starts_at <= now()
  order by case b.team when 'home' then 0 when 'away' then 1 else 2 end, b.goals desc, p.full_name
$$;
revoke all on function public.public_match_roster(text) from public;
grant execute on function public.public_match_roster(text) to anon, authenticated;

-- The signed-in player's points (all time and this month) and profile settings.
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
                            'yellow', coalesce(mm.yellow, 0), 'red', coalesce(mm.red, 0), 'late_cancels', coalesce(mm.late_cancels, 0))
  from me
  left join total t on true
  left join mm on true
$$;
revoke all on function public.my_progress() from public, anon;
grant execute on function public.my_progress() to authenticated;
