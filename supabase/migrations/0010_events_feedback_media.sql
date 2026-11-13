-- AJI TL3AB — Phase 3: teams + live match events (goals, assists, cards),
-- players' feedback on the match, private photo / video gallery.
-- Requires 0001–0009. Safe to run again.
--
-- Captain screen: the captain (or admin) puts each present player in team 1
-- ("home") or team 2 ("away"), then records goals (scorer + optional assist)
-- and cards. The score and each player's goals / assists are computed from
-- these events (a guest's goal can be recorded without a player).

-- ───────────────────────── teams & assists ─────────────────────────

alter table public.bookings add column if not exists team text check (team is null or team in ('home', 'away'));
alter table public.bookings add column if not exists assists smallint not null default 0 check (assists between 0 and 50);

-- ───────────────────────── match events ─────────────────────────

create table if not exists public.match_events (
  id          bigint generated always as identity primary key,
  match_id    text not null references public.matches (id) on delete cascade,
  kind        text not null check (kind in ('goal', 'yellow', 'red')),
  user_id     uuid references public.profiles (id) on delete set null,   -- scorer / carded player (null = guest)
  assist_id   uuid references public.profiles (id) on delete set null,   -- goals only
  team        text check (team in ('home', 'away')),
  minute      smallint check (minute between 0 and 200),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (kind <> 'goal' or team is not null),
  check (kind = 'goal' or user_id is not null),
  check (assist_id is null or (kind = 'goal' and assist_id is distinct from user_id))
);
create index if not exists match_events_match_idx on public.match_events (match_id, id);

alter table public.match_events enable row level security;
revoke all on public.match_events from anon;

drop policy if exists "events: staff read" on public.match_events;
create policy "events: staff read" on public.match_events
  for select to authenticated using (public.can_manage_match(match_id));
-- Writes only through staff_add_event / staff_delete_event.

-- Score, goals and assists follow the goal events. Only when goals are
-- involved (p_force) or already recorded, so a score / goals typed by hand
-- aren't wiped by a card.
drop function if exists public.match_events_recount(text);
create or replace function public.match_events_recount(p_match_id text, p_force boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not p_force and not exists (select 1 from public.match_events where match_id = p_match_id and kind = 'goal') then
    return;
  end if;
  update public.bookings b
  set goals = least(50, (select count(*) from public.match_events e where e.match_id = p_match_id and e.kind = 'goal' and e.user_id = b.user_id)),
      assists = least(50, (select count(*) from public.match_events e where e.match_id = p_match_id and e.kind = 'goal' and e.assist_id = b.user_id))
  where b.match_id = p_match_id;

  update public.matches m
  set home_score = least(99, (select count(*) from public.match_events e where e.match_id = p_match_id and e.kind = 'goal' and e.team = 'home')),
      away_score = least(99, (select count(*) from public.match_events e where e.match_id = p_match_id and e.kind = 'goal' and e.team = 'away')),
      home_name = coalesce(m.home_name, 'Équipe 1'),
      away_name = coalesce(m.away_name, 'Équipe 2')
  where m.id = p_match_id;
end;
$$;
revoke all on function public.match_events_recount(text, boolean) from public, anon, authenticated;

-- Events can be recorded from 30 min before kick-off until 3 days after.
create or replace function public.match_live_window(p_match_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_match_id and m.status = 'published'
      and now() between m.starts_at - interval '30 minutes' and m.starts_at + interval '3 days'
  )
$$;
revoke all on function public.match_live_window(text) from public, anon;
grant execute on function public.match_live_window(text) to authenticated;

create or replace function public.staff_set_team(p_match_id text, p_user_id uuid, p_team text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'forbidden';
  end if;
  if p_team is not null and p_team not in ('home', 'away') then
    raise exception 'invalid_team';
  end if;
  update public.bookings set team = p_team where match_id = p_match_id and user_id = p_user_id;
  if not found then
    raise exception 'no_booking';
  end if;
end;
$$;
revoke all on function public.staff_set_team(text, uuid, text) from public, anon;
grant execute on function public.staff_set_team(text, uuid, text) to authenticated;

-- Record a goal / card. For a goal, the team defaults to the scorer's team.
create or replace function public.staff_add_event(
  p_match_id text, p_kind text, p_user_id uuid, p_assist_id uuid default null, p_team text default null, p_minute integer default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := p_team;
  new_id bigint;
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'forbidden';
  end if;
  if not public.match_live_window(p_match_id) then
    raise exception 'not_live';
  end if;
  if p_kind not in ('goal', 'yellow', 'red') then
    raise exception 'invalid_event';
  end if;
  -- Players must be booked on this match.
  if p_user_id is not null and not exists (select 1 from public.bookings where match_id = p_match_id and user_id = p_user_id) then
    raise exception 'not_in_match';
  end if;
  if p_assist_id is not null and not exists (select 1 from public.bookings where match_id = p_match_id and user_id = p_assist_id) then
    raise exception 'not_in_match';
  end if;
  if t is null and p_user_id is not null then
    select team into t from public.bookings where match_id = p_match_id and user_id = p_user_id;
  end if;
  if p_kind = 'goal' and t is null then
    raise exception 'team_required';
  end if;
  insert into public.match_events (match_id, kind, user_id, assist_id, team, minute, created_by)
  values (p_match_id, p_kind, p_user_id, case when p_kind = 'goal' then p_assist_id end, t, p_minute, auth.uid())
  returning id into new_id;
  perform public.match_events_recount(p_match_id, p_kind = 'goal');
  return new_id;
end;
$$;
revoke all on function public.staff_add_event(text, text, uuid, uuid, text, integer) from public, anon;
grant execute on function public.staff_add_event(text, text, uuid, uuid, text, integer) to authenticated;

create or replace function public.staff_delete_event(p_event_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid text;
  k text;
begin
  select match_id, kind into mid, k from public.match_events where id = p_event_id;
  if mid is null or not public.can_manage_match(mid) then
    raise exception 'forbidden';
  end if;
  delete from public.match_events where id = p_event_id;
  perform public.match_events_recount(mid, k = 'goal');
end;
$$;
revoke all on function public.staff_delete_event(bigint) from public, anon;
grant execute on function public.staff_delete_event(bigint) to authenticated;

-- Staff view of the events (with full names).
create or replace function public.staff_match_events(p_match_id text)
returns table (id bigint, kind text, team text, minute integer, player text, assist text, created_at timestamptz)
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
    select e.id, e.kind, e.team, e.minute::integer, p.full_name, a.full_name, e.created_at
    from public.match_events e
    left join public.profiles p on p.id = e.user_id
    left join public.profiles a on a.id = e.assist_id
    where e.match_id = p_match_id
    order by e.id;
end;
$$;
revoke all on function public.staff_match_events(text) from public, anon;
grant execute on function public.staff_match_events(text) to authenticated;

-- Public: events of a played match, with short names.
create or replace function public.public_match_events(p_match_id text)
returns table (kind text, team text, minute integer, player text, assist text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.kind, e.team, e.minute::integer,
         case when p.id is null then null else public.public_name(p.full_name) end,
         case when a.id is null then null else public.public_name(a.full_name) end
  from public.match_events e
  join public.matches m on m.id = e.match_id
  left join public.profiles p on p.id = e.user_id
  left join public.profiles a on a.id = e.assist_id
  where e.match_id = p_match_id and m.status = 'published' and m.starts_at <= now()
  order by e.id
$$;
revoke all on function public.public_match_events(text) from public;
grant execute on function public.public_match_events(text) to anon, authenticated;

-- Roster now also shows each player's team and assists.
drop function if exists public.staff_match_roster(text);
create function public.staff_match_roster(p_match_id text)
returns table (
  user_id uuid, player_name text, phone text, player_position text, status text,
  guests integer, shoe_size integer, guest_shoe_size integer,
  attended boolean, goals integer, created_at timestamptz, paid_mad integer, team text, assists integer
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
           b.attended, b.goals::integer, b.created_at, b.paid_mad, b.team, b.assists::integer
    from public.bookings b
    left join public.profiles p on p.id = b.user_id
    where b.match_id = p_match_id
    union all
    select w.user_id, coalesce(p.full_name, w.player_name), p.phone, p.position, 'waiting'::text,
           0, null::integer, null::integer, null::boolean, null::integer, w.created_at, null::integer, null::text, null::integer
    from public.waitlist w
    left join public.profiles p on p.id = w.user_id
    where w.match_id = p_match_id and w.promoted_at is null
    order by 5, 11;
end;
$$;
revoke all on function public.staff_match_roster(text) from public, anon;
grant execute on function public.staff_match_roster(text) to authenticated;

-- ───────────────────────── players' feedback ─────────────────────────

create table if not exists public.match_feedback (
  match_id      text not null,
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  organisation  smallint not null check (organisation between 1 and 3),   -- 1 mauvais · 2 correct · 3 top
  refereeing    smallint not null check (refereeing between 1 and 3),
  intensity     smallint not null check (intensity between 1 and 3),      -- 1 chill · 2 normal · 3 intense
  level_vote    smallint not null check (level_vote between -1 and 1),    -- baisser · garder · monter
  comment       text check (char_length(comment) <= 300),
  created_at    timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.match_feedback enable row level security;
revoke all on public.match_feedback from anon;

-- Same window as the votes: players who were there, from 1 h to 49 h after kick-off.
create or replace function public.feedback_allowed(p_match_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bookings b
    where b.match_id = p_match_id and b.user_id = auth.uid() and b.attended
      and now() between b.match_start + interval '1 hour' and b.match_start + interval '49 hours'
  )
$$;
revoke all on function public.feedback_allowed(text) from public, anon;
grant execute on function public.feedback_allowed(text) to authenticated;

drop policy if exists "feedback: read own" on public.match_feedback;
create policy "feedback: read own" on public.match_feedback
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "feedback: give" on public.match_feedback;
create policy "feedback: give" on public.match_feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.feedback_allowed(match_id));

-- Admin / captain: averages and comments for a match.
create or replace function public.staff_match_feedback(p_match_id text)
returns table (answers integer, organisation numeric, refereeing numeric, intensity numeric, level_vote numeric, comments text[])
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
    select count(*)::integer,
           round(avg(f.organisation), 1), round(avg(f.refereeing), 1), round(avg(f.intensity), 1), round(avg(f.level_vote), 2),
           coalesce(array_agg(f.comment order by f.created_at) filter (where nullif(btrim(f.comment), '') is not null), '{}')
    from public.match_feedback f
    where f.match_id = p_match_id;
end;
$$;
revoke all on function public.staff_match_feedback(text) from public, anon;
grant execute on function public.staff_match_feedback(text) to authenticated;

-- ───────────────────────── private gallery (Supabase Storage) ─────────────────────────
-- Bucket "match-media", private. Files at "<match id>/<file>". Staff of the
-- match upload / delete; only staff and players who attended can see them.

create or replace function public.attended_match(p_match_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.bookings b where b.match_id = p_match_id and b.user_id = auth.uid() and b.attended)
$$;
revoke all on function public.attended_match(text) from public, anon;
grant execute on function public.attended_match(text) to authenticated;

-- How many photos / videos a match has (public: shown as "12 photos privées").
create or replace function public.match_media_count(p_match_id text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from storage.objects o
  where o.bucket_id = 'match-media' and split_part(o.name, '/', 1) = p_match_id
$$;
revoke all on function public.match_media_count(text) from public;
grant execute on function public.match_media_count(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('match-media', 'match-media', false, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "match-media: read (players & staff)" on storage.objects;
create policy "match-media: read (players & staff)" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'match-media'
    and (public.can_manage_match(split_part(name, '/', 1)) or public.attended_match(split_part(name, '/', 1)))
  );

drop policy if exists "match-media: upload (staff)" on storage.objects;
create policy "match-media: upload (staff)" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'match-media' and public.can_manage_match(split_part(name, '/', 1)));

drop policy if exists "match-media: delete (staff)" on storage.objects;
create policy "match-media: delete (staff)" on storage.objects
  for delete to authenticated
  using (bucket_id = 'match-media' and public.can_manage_match(split_part(name, '/', 1)));
