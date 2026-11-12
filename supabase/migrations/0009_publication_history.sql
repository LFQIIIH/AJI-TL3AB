-- AJI TL3AB — Phase 2: scheduled match publication + public match history.
-- Requires 0001–0008. Safe to run again.
--
-- publish_at: a published match stays hidden (and can't be booked) until
-- this time; /jouer shows a countdown to the next publication.

alter table public.matches add column if not exists publish_at timestamptz;

-- Public list: published matches whose publication time has come.
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
    and (m.publish_at is null or m.publish_at <= now())
    and m.starts_at between p_from and p_to
  order by m.starts_at
$$;

revoke all on function public.public_matches(timestamptz, timestamptz) from public;
grant execute on function public.public_matches(timestamptz, timestamptz) to anon, authenticated;

-- Next scheduled publication (null if none): for the countdown on /jouer.
create or replace function public.next_publication()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select min(publish_at) from public.matches
  where status = 'published' and publish_at > now() and starts_at > now()
$$;

revoke all on function public.next_publication() from public;
grant execute on function public.next_publication() to anon, authenticated;

-- Booking / waiting list: not before publication.
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
  if m.status <> 'published' or (m.publish_at is not null and m.publish_at > now()) then
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
    if m.status <> 'published' or m.starts_at <= now() or (m.publish_at is not null and m.publish_at > now()) then
      raise exception 'match_unavailable';
    end if;
    new.match_start := m.starts_at;
    new.match_date := (m.starts_at at time zone 'Africa/Casablanca')::date;
  end if;
  return new;
end;
$$;

-- Public history: short names ("Yassine B.") of the players who were at
-- played matches, for the player search on /jouer/historique.
create or replace function public.public_match_players(p_match_ids text[])
returns table (match_id text, player text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.match_id, public.public_name(coalesce(p.full_name, b.player_name))
  from public.bookings b
  join public.matches m on m.id = b.match_id
  left join public.profiles p on p.id = b.user_id
  where b.match_id = any (p_match_ids[1:200])
    and m.status = 'published'
    and m.starts_at <= now()
    and b.attended
  order by 1, 2
$$;

revoke all on function public.public_match_players(text[]) from public;
grant execute on function public.public_match_players(text[]) to anon, authenticated;
