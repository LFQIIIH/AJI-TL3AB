-- AJI TL3AB — online bookings, waiting list, votes, goals, leaderboard,
-- monthly draw and referrals.
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Requires 0001_profiles.sql. Safe to run again.
--
-- What you (admin) edit in Table Editor:
--   bookings.attended  → untick players who didn't show up
--   bookings.goals     → goals scored by each player in that match
-- Monthly draw (1st of each month, for the previous month):
--   select * from public.run_monthly_draw('2026-11-01');
--
-- Privacy: players only ever read their own rows. Public functions below
-- return counts or short names ("Yassine B."), never phones or e-mails.

-- ───────────────────────── helpers ─────────────────────────

-- "Yassine Ben Ali" → "Yassine A."
create or replace function public.public_name(full_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when array_length(regexp_split_to_array(btrim(full_name), '\s+'), 1) < 2 then btrim(full_name)
    else (regexp_split_to_array(btrim(full_name), '\s+'))[1] || ' ' ||
         upper(left((regexp_split_to_array(btrim(full_name), '\s+'))[array_length(regexp_split_to_array(btrim(full_name), '\s+'), 1)], 1)) || '.'
  end
$$;

create or replace function public.marrakech_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Africa/Casablanca')::date $$;

-- ───────────────────────── referrals ─────────────────────────

alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;
-- Write-only: the app sends the friend's code here on profile creation; the
-- trigger resolves it to referred_by and clears it.
alter table public.profiles add column if not exists referral_input text;

create or replace function public.new_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

-- security definer: the lookup must see other players' codes, which RLS hides.
create or replace function public.profiles_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.referral_code := public.new_referral_code();
    new.referred_by := (
      select p.id from public.profiles p
      where new.referral_input is not null
        and p.referral_code = upper(btrim(new.referral_input))
        and p.id <> new.id
    );
  else
    -- Never changeable by the player after creation.
    new.referral_code := old.referral_code;
    new.referred_by := old.referred_by;
  end if;
  new.referral_input := null;
  return new;
end;
$$;

drop trigger if exists profiles_referral on public.profiles;
create trigger profiles_referral
  before insert or update on public.profiles
  for each row execute function public.profiles_referral();

update public.profiles set referral_code = public.new_referral_code() where referral_code is null;

-- ───────────────────────── bookings ─────────────────────────
-- match_id is built by the site from the Google Sheet row: date-time-pitch.

create table if not exists public.bookings (
  match_id     text not null check (char_length(match_id) between 1 and 120),
  match_date   date not null,
  match_start  timestamptz not null,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  guests       smallint not null default 0 check (guests between 0 and 1),  -- +1 friend
  attended     boolean not null default true,  -- admin: untick no-shows
  goals        smallint not null default 0 check (goals between 0 and 50),  -- admin
  player_name  text,  -- copied from the profile so the admin table is readable
  created_at   timestamptz not null default now(),
  primary key (match_id, user_id),
  check (match_date = (match_start at time zone 'Africa/Casablanca')::date)
);
create index if not exists bookings_user_idx on public.bookings (user_id, match_start);
create index if not exists bookings_date_idx on public.bookings (match_date);

alter table public.bookings enable row level security;

drop policy if exists "bookings: read own" on public.bookings;
create policy "bookings: read own" on public.bookings
  for select to authenticated using ((select auth.uid()) = user_id);

-- Book yourself (profile required by the foreign key), for an upcoming match.
-- Cancelling goes through cancel_booking() so the waiting list is served.
drop policy if exists "bookings: book own" on public.bookings;
create policy "bookings: book own" on public.bookings
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and match_start > now()
    and match_start < now() + interval '60 days'
  );

revoke all on public.bookings from anon;

create or replace function public.bookings_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Players can't pre-fill admin fields.
  new.attended := true;
  new.goals := 0;
  new.created_at := now();
  new.player_name := (select full_name from public.profiles where id = new.user_id);
  return new;
end;
$$;

drop trigger if exists bookings_before_insert on public.bookings;
create trigger bookings_before_insert
  before insert on public.bookings
  for each row execute function public.bookings_before_insert();

-- ───────────────────────── waiting list ─────────────────────────

create table if not exists public.waitlist (
  match_id     text not null check (char_length(match_id) between 1 and 120),
  match_date   date not null,
  match_start  timestamptz not null,
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  promoted_at  timestamptz,  -- set when a spot freed up and they were booked automatically
  player_name  text,
  primary key (match_id, user_id)
);

alter table public.waitlist enable row level security;

drop policy if exists "waitlist: read own" on public.waitlist;
create policy "waitlist: read own" on public.waitlist
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "waitlist: join" on public.waitlist;
create policy "waitlist: join" on public.waitlist
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and match_start > now()
    and not exists (
      select 1 from public.bookings b where b.match_id = waitlist.match_id and b.user_id = (select auth.uid())
    )
  );

drop policy if exists "waitlist: leave" on public.waitlist;
create policy "waitlist: leave" on public.waitlist
  for delete to authenticated
  using ((select auth.uid()) = user_id and promoted_at is null);

revoke all on public.waitlist from anon;

create or replace function public.waitlist_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  new.promoted_at := null;
  new.player_name := (select full_name from public.profiles where id = new.user_id);
  return new;
end;
$$;

drop trigger if exists waitlist_before_insert on public.waitlist;
create trigger waitlist_before_insert
  before insert on public.waitlist
  for each row execute function public.waitlist_before_insert();

-- Cancel your booking (before kick-off). The spots it frees go to the first
-- people on the waiting list, who are booked automatically.
-- Returns how many waiting players were promoted.
create or replace function public.cancel_booking(p_match_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  b public.bookings;
  w public.waitlist;
  promoted integer := 0;
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

  for w in
    select * from public.waitlist
    where match_id = p_match_id and promoted_at is null
    order by created_at
    limit 1 + b.guests
    for update skip locked
  loop
    insert into public.bookings (match_id, match_date, match_start, user_id)
    values (w.match_id, w.match_date, w.match_start, w.user_id)
    on conflict do nothing;
    update public.waitlist set promoted_at = now() where match_id = w.match_id and user_id = w.user_id;
    promoted := promoted + 1;
  end loop;

  return promoted;
end;
$$;

revoke all on function public.cancel_booking(text) from public, anon;
grant execute on function public.cancel_booking(text) to authenticated;

-- Public: online bookings (incl. +1 friends) and waiting-list size per match.
create or replace function public.match_booking_counts(p_match_ids text[])
returns table (match_id text, booked integer, waiting integer)
language sql
stable
security definer
set search_path = ''
as $$
  with ids as (select unnest(p_match_ids[1:100]) as match_id)
  select
    ids.match_id,
    coalesce((select sum(1 + b.guests)::integer from public.bookings b where b.match_id = ids.match_id), 0),
    coalesce((select count(*)::integer from public.waitlist w where w.match_id = ids.match_id and w.promoted_at is null), 0)
  from ids
$$;

revoke all on function public.match_booking_counts(text[]) from public;
grant execute on function public.match_booking_counts(text[]) to anon, authenticated;

-- ───────────────────────── votes ─────────────────────────
-- After a match, players who were there vote for the best gardien,
-- défenseur and milieu among the other players who were there.
-- Voting opens 1 h after kick-off and closes 48 h after the match.

create table if not exists public.votes (
  match_id      text not null,
  category      text not null check (category in ('gardien', 'defenseur', 'milieu')),
  voter_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  candidate_id  uuid not null references public.profiles (id) on delete cascade,
  match_date    date,  -- copied from the booking
  created_at    timestamptz not null default now(),
  primary key (match_id, category, voter_id),
  check (voter_id <> candidate_id)
);
create index if not exists votes_candidate_idx on public.votes (candidate_id, match_date);

alter table public.votes enable row level security;

drop policy if exists "votes: read own" on public.votes;
create policy "votes: read own" on public.votes
  for select to authenticated using ((select auth.uid()) = voter_id);

-- security definer: must look at the candidate's booking, which RLS hides
-- from the voter.
create or replace function public.vote_allowed(p_match_id text, p_candidate uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.bookings b
      where b.match_id = p_match_id and b.user_id = auth.uid() and b.attended
        and now() between b.match_start + interval '1 hour' and b.match_start + interval '49 hours'
    )
    and exists (
      select 1 from public.bookings c
      where c.match_id = p_match_id and c.user_id = p_candidate and c.attended
    )
$$;

revoke all on function public.vote_allowed(text, uuid) from public, anon;
grant execute on function public.vote_allowed(text, uuid) to authenticated;

drop policy if exists "votes: cast" on public.votes;
create policy "votes: cast" on public.votes
  for insert to authenticated
  with check (
    (select auth.uid()) = voter_id
    and public.vote_allowed(match_id, candidate_id)
  );

revoke all on public.votes from anon;

create or replace function public.votes_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  new.match_date := (select b.match_date from public.bookings b where b.match_id = new.match_id limit 1);
  return new;
end;
$$;

drop trigger if exists votes_before_insert on public.votes;
create trigger votes_before_insert
  before insert on public.votes
  for each row execute function public.votes_before_insert();

-- The ballot: other players who attended, only for someone who attended too.
create or replace function public.match_players(p_match_id text)
returns table (user_id uuid, name text, player_position text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, public.public_name(p.full_name), p.position
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  where b.match_id = p_match_id and b.attended and b.user_id <> auth.uid()
    and exists (
      select 1 from public.bookings me
      where me.match_id = p_match_id and me.user_id = auth.uid() and me.attended
    )
  order by p.full_name
$$;

revoke all on function public.match_players(text) from public, anon;
grant execute on function public.match_players(text) to authenticated;

-- ───────────────────────── awards & leaderboard ─────────────────────────

-- Per closed match: most-voted gardien / défenseur / milieu, and top scorer
-- (ties: every tied player wins). Internal — returns player ids.
create or replace function public.match_award_winners(p_match_ids text[])
returns table (match_id text, category text, user_id uuid, value integer)
language sql
stable
security definer
set search_path = ''
as $$
  with closed as (
    select distinct b.match_id
    from public.bookings b
    where b.match_id = any (p_match_ids[1:500]) and now() > b.match_start + interval '49 hours'
  ),
  totals as (
    select v.match_id, v.category, v.candidate_id as user_id, count(*)::integer as value
    from public.votes v join closed using (match_id)
    group by 1, 2, 3
    union all
    select b.match_id, 'buteur', b.user_id, b.goals::integer
    from public.bookings b join closed using (match_id)
    where b.attended and b.goals > 0
  )
  select t.match_id, t.category, t.user_id, t.value
  from (select *, rank() over (partition by match_id, category order by value desc) as r from totals) t
  where t.r = 1
$$;

revoke all on function public.match_award_winners(text[]) from public, anon, authenticated;

-- Public version with short names ("Yassine B. & Amine T." on a tie).
create or replace function public.match_awards(p_match_ids text[])
returns table (match_id text, category text, name text, value integer)
language sql
stable
security definer
set search_path = ''
as $$
  select w.match_id, w.category, string_agg(public.public_name(p.full_name), ' & ' order by p.full_name), max(w.value)
  from public.match_award_winners(p_match_ids[1:50]) w
  join public.profiles p on p.id = w.user_id
  group by w.match_id, w.category
$$;

revoke all on function public.match_awards(text[]) from public;
grant execute on function public.match_awards(text[]) to anon, authenticated;

-- Rankings between two dates: buteurs (goals) and votes per position.
create or replace function public.leaderboard(p_from date, p_to date, p_limit integer default 10)
returns table (category text, rank integer, name text, player_position text, value integer, matches integer)
language sql
stable
security definer
set search_path = ''
as $$
  with played as (
    select b.user_id, count(*)::integer as matches, sum(b.goals)::integer as goals
    from public.bookings b
    where b.attended and b.match_date between p_from and p_to and b.match_start < now()
    group by b.user_id
  ),
  scores as (
    select 'buteur'::text as category, user_id, goals as value from played where goals > 0
    union all
    select v.category, v.candidate_id, count(*)::integer
    from public.votes v
    where v.match_date between p_from and p_to
    group by v.category, v.candidate_id
  ),
  ranked as (
    select s.*, rank() over (partition by s.category order by s.value desc)::integer as rk,
           row_number() over (partition by s.category order by s.value desc) as rn
    from scores s
  )
  select r.category, r.rk, public.public_name(p.full_name), p.position, r.value, coalesce(pl.matches, 0)
  from ranked r
  join public.profiles p on p.id = r.user_id
  left join played pl on pl.user_id = r.user_id
  where r.rn <= least(p_limit, 50)
  order by r.category, r.rk, p.full_name
$$;

revoke all on function public.leaderboard(date, date, integer) from public;
grant execute on function public.leaderboard(date, date, integer) to anon, authenticated;

-- Équipe du mois: the 5 players with the most votes that month (goals break ties).
create or replace function public.team_of_month(p_month date)
returns table (name text, player_position text, votes integer, goals integer)
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select date_trunc('month', p_month)::date as start,
           (date_trunc('month', p_month) + interval '1 month - 1 day')::date as stop
  ),
  v as (
    select v.candidate_id as user_id, count(*)::integer as votes
    from public.votes v, m where v.match_date between m.start and m.stop
    group by 1
  ),
  g as (
    select b.user_id, sum(b.goals)::integer as goals
    from public.bookings b, m where b.attended and b.match_date between m.start and m.stop
    group by 1
  )
  select public.public_name(p.full_name), p.position, v.votes, coalesce(g.goals, 0)
  from v join public.profiles p on p.id = v.user_id left join g on g.user_id = v.user_id
  order by v.votes desc, coalesce(g.goals, 0) desc, p.full_name
  limit 5
$$;

revoke all on function public.team_of_month(date) from public;
grant execute on function public.team_of_month(date) to anon, authenticated;

-- ───────────────────────── monthly draw ─────────────────────────
-- Everyone who played that month gets 1 ticket, +1 per friend they referred
-- who also played that month.

create or replace function public.draw_entries(p_month date)
returns table (user_id uuid, tickets integer)
language sql
stable
security definer
set search_path = ''
as $$
  with m as (
    select date_trunc('month', p_month)::date as start,
           (date_trunc('month', p_month) + interval '1 month - 1 day')::date as stop
  ),
  players as (
    select distinct b.user_id
    from public.bookings b, m
    where b.attended and b.match_date between m.start and m.stop and b.match_start < now()
  )
  select pl.user_id,
         (1 + (select count(*) from public.profiles f join players fp on fp.user_id = f.id where f.referred_by = pl.user_id))::integer
  from players pl
$$;

revoke all on function public.draw_entries(date) from public, anon, authenticated;

create table if not exists public.draws (
  month        date primary key check (extract(day from month) = 1),
  winner_id    uuid references public.profiles (id) on delete set null,
  winner_name  text not null,  -- public short name, e.g. "Yassine B."
  entrants     integer not null,
  tickets      integer not null,
  drawn_at     timestamptz not null default now()
);

alter table public.draws enable row level security;

drop policy if exists "draws: public" on public.draws;
create policy "draws: public" on public.draws for select to anon, authenticated using (true);

-- Everyone may see past winners' short names, never their id.
revoke all on public.draws from anon, authenticated;
grant select (month, winner_name, entrants, tickets, drawn_at) on public.draws to anon, authenticated;

-- Admin only (SQL Editor). Draws once per month; running it again returns
-- the existing result instead of drawing again.
create or replace function public.run_monthly_draw(p_month date)
returns table (month date, winner_name text, entrants integer, tickets integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  m date := date_trunc('month', p_month)::date;
  winner uuid;
begin
  if not exists (select 1 from public.draws d where d.month = m) then
    select e.user_id into winner
    from public.draw_entries(m) e, generate_series(1, e.tickets)
    order by random()
    limit 1;

    if winner is null then
      raise exception 'Aucun joueur éligible pour %', to_char(m, 'MM/YYYY');
    end if;

    insert into public.draws (month, winner_id, winner_name, entrants, tickets)
    select m, winner, public.public_name(p.full_name),
           (select count(*) from public.draw_entries(m)),
           (select coalesce(sum(t.tickets), 0) from public.draw_entries(m) t)
    from public.profiles p where p.id = winner;
  end if;

  return query select d.month, d.winner_name, d.entrants, d.tickets from public.draws d where d.month = m;
end;
$$;

revoke all on function public.run_monthly_draw(date) from public, anon, authenticated;

-- Public: how many players / tickets are in this month's draw so far.
create or replace function public.draw_status(p_month date)
returns table (entrants integer, tickets integer)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer, coalesce(sum(tickets), 0)::integer from public.draw_entries(p_month)
$$;

revoke all on function public.draw_status(date) from public;
grant execute on function public.draw_status(date) to anon, authenticated;

-- ───────────────────────── personal stats ─────────────────────────

create or replace function public.my_stats()
returns table (
  matches integer,
  goals integer,
  best_match_goals integer,
  awards integer,
  votes_received integer,
  referral_code text,
  referrals_signed_up integer,
  referrals_played integer,
  week_streak integer,
  tickets_this_month integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  streak integer := 0;
  wk date := date_trunc('week', public.marrakech_today())::date;
begin
  if uid is null then
    return;
  end if;

  -- Consecutive weeks with a match, counting back from this week (or last
  -- week if they haven't played yet this week).
  if not exists (
    select 1 from public.bookings b
    where b.user_id = uid and b.attended and b.match_start < now() and date_trunc('week', b.match_date)::date = wk
  ) then
    wk := wk - 7;
  end if;
  while exists (
    select 1 from public.bookings b
    where b.user_id = uid and b.attended and b.match_start < now() and date_trunc('week', b.match_date)::date = wk
  ) loop
    streak := streak + 1;
    wk := wk - 7;
  end loop;

  return query
  with mine as (
    select * from public.bookings b where b.user_id = uid and b.attended and b.match_start < now()
  ),
  my_matches as (select array_agg(match_id) as ids from mine),
  won as (
    select count(*)::integer as n
    from my_matches mm, public.match_award_winners(coalesce(mm.ids, '{}')) w
    where w.user_id = uid
  )
  select
    (select count(*)::integer from mine),
    (select coalesce(sum(goals), 0)::integer from mine),
    (select coalesce(max(goals), 0)::integer from mine),
    (select n from won),
    (select count(*)::integer from public.votes v where v.candidate_id = uid),
    (select p.referral_code from public.profiles p where p.id = uid),
    (select count(*)::integer from public.profiles f where f.referred_by = uid),
    (select count(*)::integer from public.profiles f
       where f.referred_by = uid
         and exists (select 1 from public.bookings b where b.user_id = f.id and b.attended and b.match_start < now())),
    streak,
    coalesce((select e.tickets from public.draw_entries(public.marrakech_today()) e where e.user_id = uid), 0);
end;
$$;

revoke all on function public.my_stats() from public, anon;
grant execute on function public.my_stats() to authenticated;
