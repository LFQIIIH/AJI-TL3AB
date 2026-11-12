-- AJI TL3AB — matches in the database + admin / captain area (Step 0).
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Requires 0001–0006. Safe to run again.
--
-- After running it, make yourself admin (replace the e-mail with the one you
-- log in with on the site):
--   insert into public.staff (user_id, role)
--   select id, 'admin' from auth.users where lower(email) = lower('ton@email.com')
--   on conflict (user_id) do update set role = 'admin';
--
-- Then on the site: /admin → "Importer le Google Sheet" copies the matches
-- (and results) from the sheet into the database, keeping their ids so
-- existing bookings, votes and stats stay linked. Switch the site to the
-- database with the Vercel env var MATCHES_SOURCE=supabase.
--
-- Privacy: matches are read by the public through public_matches() (no admin
-- notes, no captain id). Players' phones are only visible to admins and to
-- the captain of that match, through staff_match_roster().

-- ───────────────────────── staff (admin / captain) ─────────────────────────

create table if not exists public.staff (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('admin', 'captain')),
  created_at  timestamptz not null default now()
);

alter table public.staff enable row level security;
revoke all on public.staff from anon;

-- Role of the signed-in user ('admin', 'captain' or null).
-- security definer: the staff table is only readable through these helpers.
create or replace function public.my_staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.staff where user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff where user_id = auth.uid() and role = 'admin')
$$;

revoke all on function public.my_staff_role() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.my_staff_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "staff: read own or admin" on public.staff;
create policy "staff: read own or admin" on public.staff
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
-- No insert/update/delete policies: staff changes go through admin_set_staff()
-- (or the SQL Editor for the very first admin).

-- ───────────────────────── pitches ─────────────────────────

create table if not exists public.pitches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(btrim(name)) between 2 and 80),
  area        text not null default '' check (char_length(area) <= 80),
  address     text not null default '' check (char_length(address) <= 200),
  maps_url    text check (maps_url is null or maps_url ~ '^https://'),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.pitches enable row level security;

drop policy if exists "pitches: public read" on public.pitches;
create policy "pitches: public read" on public.pitches
  for select to anon, authenticated using (true);

drop policy if exists "pitches: admin write" on public.pitches;
create policy "pitches: admin write" on public.pitches
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ───────────────────────── matches ─────────────────────────

create table if not exists public.matches (
  -- Text so matches imported from the Google Sheet keep their old ids
  -- ("2026-11-20-20:00-urbanfoot"), which bookings and votes already use.
  id           text primary key default gen_random_uuid()::text check (char_length(id) between 1 and 120),
  starts_at    timestamptz not null,
  pitch_id     uuid not null references public.pitches (id) on delete restrict,
  format       text not null check (format in ('5v5', '7v7', '9v9')),
  level        text not null default 'Tous niveaux'
               check (level in ('Débutant', 'Intermédiaire', 'Confirmé', 'Tous niveaux')),
  category     text not null default 'mixte' check (category in ('mixte', 'hommes', 'femmes', 'enfants')),
  price_mad    integer not null check (price_mad between 0 and 2000),
  total_spots  smallint not null check (total_spots between 2 and 40),
  -- Places taken outside the site (WhatsApp, cash on the spot…).
  extra_spots  smallint not null default 0 check (extra_spots >= 0),
  status       text not null default 'published' check (status in ('draft', 'published', 'cancelled')),
  captain_id   uuid references auth.users (id) on delete set null,
  -- Result (filled in after the match by the admin or the captain).
  home_name    text check (char_length(home_name) <= 40),
  away_name    text check (char_length(away_name) <= 40),
  home_score   smallint check (home_score between 0 and 99),
  away_score   smallint check (away_score between 0 and 99),
  mvp_name     text check (char_length(mvp_name) <= 60),
  notes        text check (char_length(notes) <= 1000),  -- admin only, never public
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (extra_spots <= total_spots)
);
create index if not exists matches_starts_idx on public.matches (starts_at);

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

alter table public.matches enable row level security;
revoke all on public.matches from anon;

drop policy if exists "matches: staff read" on public.matches;
create policy "matches: staff read" on public.matches
  for select to authenticated
  using ((select public.is_admin()) or captain_id = (select auth.uid()));

drop policy if exists "matches: admin insert" on public.matches;
create policy "matches: admin insert" on public.matches
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "matches: admin update" on public.matches;
create policy "matches: admin update" on public.matches
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- security definer: must see every player's booking (RLS shows the admin only their own).
create or replace function public.match_has_bookings(p_match_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.bookings b where b.match_id = p_match_id)
      or exists (select 1 from public.waitlist w where w.match_id = p_match_id and w.promoted_at is null)
$$;

revoke all on function public.match_has_bookings(text) from public, anon;
grant execute on function public.match_has_bookings(text) to authenticated;

-- A match that already has online bookings can't be deleted (cancel it instead).
drop policy if exists "matches: admin delete" on public.matches;
create policy "matches: admin delete" on public.matches
  for delete to authenticated
  using ((select public.is_admin()) and not public.match_has_bookings(id));

-- Moving a match: its bookings and waiting list follow (votes, stats and the
-- "upcoming / played" logic use the booking's date).
create or replace function public.matches_sync_bookings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    update public.bookings
      set match_start = new.starts_at,
          match_date = (new.starts_at at time zone 'Africa/Casablanca')::date
      where match_id = new.id;
    update public.waitlist
      set match_start = new.starts_at,
          match_date = (new.starts_at at time zone 'Africa/Casablanca')::date
      where match_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists matches_sync_bookings on public.matches;
create trigger matches_sync_bookings
  after update of starts_at on public.matches
  for each row execute function public.matches_sync_bookings();

-- Public list for the site: published matches between two dates, with
-- online bookings and waiting-list size. No notes, no captain id.
create or replace function public.public_matches(
  p_from timestamptz default now() - interval '120 days',
  p_to   timestamptz default now() + interval '60 days'
)
returns table (
  id text, starts_at timestamptz, pitch text, area text, address text, maps_url text,
  format text, level text, category text, price_mad integer, total_spots integer, extra_spots integer,
  booked integer, waiting integer,
  home_name text, away_name text, home_score integer, away_score integer, mvp_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id, m.starts_at, p.name, p.area, p.address, p.maps_url,
    m.format, m.level, m.category, m.price_mad, m.total_spots::integer, m.extra_spots::integer,
    coalesce((select sum(1 + b.guests)::integer from public.bookings b where b.match_id = m.id), 0),
    coalesce((select count(*)::integer from public.waitlist w where w.match_id = m.id and w.promoted_at is null), 0),
    m.home_name, m.away_name, m.home_score::integer, m.away_score::integer, m.mvp_name
  from public.matches m
  join public.pitches p on p.id = m.pitch_id
  where m.status = 'published'
    and m.starts_at between p_from and p_to
  order by m.starts_at
$$;

revoke all on function public.public_matches(timestamptz, timestamptz) from public;
grant execute on function public.public_matches(timestamptz, timestamptz) to anon, authenticated;

-- ───────────────────────── capacity (enforced by the database) ─────────────────────────
-- For matches in the database: the match must be published and not started,
-- its real date is copied onto the booking, and online bookings (+1 friends)
-- + places taken outside the site can't exceed the spots. The match row is
-- locked, so two players can't take the last place at the same moment.
-- Bookings for matches that only exist in the Google Sheet are left as before.

create or replace function public.bookings_check_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  taken integer;
begin
  select * into m from public.matches where id = new.match_id for update;
  if not found then
    return new;
  end if;
  if m.status <> 'published' then
    raise exception 'match_unavailable';
  end if;
  if m.starts_at <= now() then
    raise exception 'match_started';
  end if;
  new.match_start := m.starts_at;
  new.match_date := (m.starts_at at time zone 'Africa/Casablanca')::date;

  select coalesce(sum(1 + b.guests), 0) into taken
  from public.bookings b
  where b.match_id = new.match_id;
  if taken + m.extra_spots + 1 + new.guests > m.total_spots then
    raise exception 'match_full';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_check_capacity on public.bookings;
create trigger bookings_check_capacity
  before insert on public.bookings
  for each row execute function public.bookings_check_capacity();

-- Waiting list: same real date for database matches.
create or replace function public.waitlist_sync_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
begin
  select * into m from public.matches where id = new.match_id;
  if found then
    if m.status <> 'published' or m.starts_at <= now() then
      raise exception 'match_unavailable';
    end if;
    new.match_start := m.starts_at;
    new.match_date := (m.starts_at at time zone 'Africa/Casablanca')::date;
  end if;
  return new;
end;
$$;

drop trigger if exists waitlist_sync_match on public.waitlist;
create trigger waitlist_sync_match
  before insert on public.waitlist
  for each row execute function public.waitlist_sync_match();

-- Cancel your booking: same as before, but a waiting player who no longer
-- fits (e.g. the admin lowered the spots) is skipped instead of failing the
-- whole cancellation.
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
    begin
      insert into public.bookings (match_id, match_date, match_start, user_id)
      values (w.match_id, w.match_date, w.match_start, w.user_id)
      on conflict do nothing;
      update public.waitlist set promoted_at = now() where match_id = w.match_id and user_id = w.user_id;
      promoted := promoted + 1;
    exception when others then
      exit;  -- no room any more: stop promoting
    end;
  end loop;

  return promoted;
end;
$$;

revoke all on function public.cancel_booking(text) from public, anon;
grant execute on function public.cancel_booking(text) to authenticated;

-- ───────────────────────── staff tools ─────────────────────────

-- Admin, or the captain of that match.
create or replace function public.can_manage_match(p_match_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
      or exists (select 1 from public.matches m where m.id = p_match_id and m.captain_id = auth.uid())
$$;

revoke all on function public.can_manage_match(text) from public, anon;
grant execute on function public.can_manage_match(text) to authenticated;

-- Players booked (and waiting) for a match, with phone numbers.
create or replace function public.staff_match_roster(p_match_id text)
returns table (
  user_id uuid, player_name text, phone text, player_position text, status text,
  guests integer, shoe_size integer, guest_shoe_size integer,
  attended boolean, goals integer, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'forbidden';
  end if;
  return query
    select b.user_id, coalesce(p.full_name, b.player_name), p.phone, p.position, 'booked'::text,
           b.guests::integer, b.shoe_size::integer, b.guest_shoe_size::integer,
           b.attended, b.goals::integer, b.created_at
    from public.bookings b
    left join public.profiles p on p.id = b.user_id
    where b.match_id = p_match_id
    union all
    select w.user_id, coalesce(p.full_name, w.player_name), p.phone, p.position, 'waiting'::text,
           0, null::integer, null::integer, null::boolean, null::integer, w.created_at
    from public.waitlist w
    left join public.profiles p on p.id = w.user_id
    where w.match_id = p_match_id and w.promoted_at is null
    order by 5, 11;
end;
$$;

revoke all on function public.staff_match_roster(text) from public, anon;
grant execute on function public.staff_match_roster(text) to authenticated;

-- Attendance and goals of one player (after kick-off).
create or replace function public.staff_update_booking(
  p_match_id text, p_user_id uuid, p_attended boolean, p_goals integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'forbidden';
  end if;
  if p_goals is null or p_goals < 0 or p_goals > 50 then
    raise exception 'invalid_goals';
  end if;
  update public.bookings
  set attended = coalesce(p_attended, attended), goals = p_goals
  where match_id = p_match_id and user_id = p_user_id;
  if not found then
    raise exception 'no_booking';
  end if;
end;
$$;

revoke all on function public.staff_update_booking(text, uuid, boolean, integer) from public, anon;
grant execute on function public.staff_update_booking(text, uuid, boolean, integer) to authenticated;

-- Result of a match (admin or its captain).
create or replace function public.staff_set_result(
  p_match_id text, p_home_name text, p_home_score integer, p_away_name text, p_away_score integer, p_mvp_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'forbidden';
  end if;
  update public.matches
  set home_name = nullif(btrim(p_home_name), ''),
      away_name = nullif(btrim(p_away_name), ''),
      home_score = p_home_score,
      away_score = p_away_score,
      mvp_name = nullif(btrim(p_mvp_name), '')
  where id = p_match_id and starts_at <= now();
  if not found then
    raise exception 'not_played_yet';
  end if;
end;
$$;

revoke all on function public.staff_set_result(text, text, integer, text, integer, text) from public, anon;
grant execute on function public.staff_set_result(text, text, integer, text, integer, text) to authenticated;

-- Staff list (admins only): who is admin / captain.
create or replace function public.admin_list_staff()
returns table (user_id uuid, email text, full_name text, role text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select s.user_id, u.email::text, p.full_name, s.role, s.created_at
    from public.staff s
    join auth.users u on u.id = s.user_id
    left join public.profiles p on p.id = s.user_id
    order by s.role, p.full_name;
end;
$$;

revoke all on function public.admin_list_staff() from public, anon;
grant execute on function public.admin_list_staff() to authenticated;

-- Make someone admin / captain by the e-mail they log in with, or remove
-- them (p_role = null). The last admin can't be removed.
create or replace function public.admin_set_staff(p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_role is not null and p_role not in ('admin', 'captain') then
    raise exception 'invalid_role';
  end if;
  select id into target from auth.users where lower(email) = lower(btrim(p_email));
  if target is null then
    raise exception 'user_not_found';
  end if;
  if p_role is null then
    if (select role from public.staff where user_id = target) = 'admin'
       and (select count(*) from public.staff where role = 'admin') = 1 then
      raise exception 'last_admin';
    end if;
    delete from public.staff where user_id = target;
  else
    if (select role from public.staff where user_id = target) = 'admin' and p_role <> 'admin'
       and (select count(*) from public.staff where role = 'admin') = 1 then
      raise exception 'last_admin';
    end if;
    insert into public.staff (user_id, role) values (target, p_role)
    on conflict (user_id) do update set role = excluded.role;
  end if;
  return target;
end;
$$;

revoke all on function public.admin_set_staff(text, text) from public, anon;
grant execute on function public.admin_set_staff(text, text) to authenticated;
