-- AJI TL3AB — "Switch Off" weekend sessions (training + mini-matches +
-- activities for busy professionals). 20 places per session.
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Requires 0001_profiles.sql. Safe to run again.
--
-- Sessions come from the Google Sheet's "SwitchOff" tab (date, heure,
-- terrain, quartier, note). Who signed up: Table Editor → switchoff_signups.

create table if not exists public.switchoff_signups (
  session_id    text not null,          -- "YYYY-MM-DD-HH:MM", Marrakech time (derived)
  session_date  date not null,          -- derived
  session_start timestamptz not null,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.switchoff_signups enable row level security;

drop policy if exists "switchoff: read own" on public.switchoff_signups;
create policy "switchoff: read own" on public.switchoff_signups
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "switchoff: sign up" on public.switchoff_signups;
create policy "switchoff: sign up" on public.switchoff_signups
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and session_start > now()
    and session_start < now() + interval '60 days'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  );

drop policy if exists "switchoff: cancel" on public.switchoff_signups;
create policy "switchoff: cancel" on public.switchoff_signups
  for delete to authenticated
  using ((select auth.uid()) = user_id and session_start > now());

revoke all on public.switchoff_signups from anon;

create or replace function public.switchoff_capacity()
returns integer language sql immutable set search_path = '' as $$ select 20 $$;

-- Derives id/date from the start time and refuses sign-ups once a session
-- has 20 people. security definer: must count everyone's sign-ups.
create or replace function public.switchoff_signups_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.session_id := to_char(new.session_start at time zone 'Africa/Casablanca', 'YYYY-MM-DD-HH24:MI');
  new.session_date := (new.session_start at time zone 'Africa/Casablanca')::date;
  new.created_at := now();
  -- one sign-up at a time per session, so two people can't take the last place together
  perform pg_advisory_xact_lock(hashtext('switchoff:' || new.session_id));
  if (select count(*) from public.switchoff_signups s where s.session_id = new.session_id) >= public.switchoff_capacity() then
    raise exception 'session_full';
  end if;
  return new;
end;
$$;

drop trigger if exists switchoff_signups_before_insert on public.switchoff_signups;
create trigger switchoff_signups_before_insert
  before insert on public.switchoff_signups
  for each row execute function public.switchoff_signups_before_insert();

-- Public: number of sign-ups per session (never names).
create or replace function public.switchoff_session_counts(p_session_ids text[])
returns table (session_id text, signups integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.session_id, count(*)::integer
  from public.switchoff_signups s
  where s.session_id = any (p_session_ids[1:100])
  group by s.session_id
$$;

revoke all on function public.switchoff_session_counts(text[]) from public;
grant execute on function public.switchoff_session_counts(text[]) to anon, authenticated;
