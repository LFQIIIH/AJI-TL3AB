-- AJI TL3AB — physical training sign-ups ("Je viens").
-- Run once in Supabase: SQL Editor → New query → paste → Run. Requires 0001_profiles.sql.
--
-- Privacy: a player only sees their own sign-ups. The public page only gets
-- the NUMBER of sign-ups per session (training_counts), never names.
-- You see who signed up in Table Editor → training_signups.

create table if not exists public.training_signups (
  session_date date not null
    -- mardi (2), jeudi (4), samedi (6)
    check (extract(dow from session_date) in (2, 4, 6)),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (session_date, user_id)
);

alter table public.training_signups enable row level security;

drop policy if exists "training: read own" on public.training_signups;
create policy "training: read own" on public.training_signups
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Sign up for yourself, for a session today or later (Marrakech time, max 60
-- days ahead), and only once your player profile exists.
drop policy if exists "training: sign up" on public.training_signups;
create policy "training: sign up" on public.training_signups
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and session_date >= (now() at time zone 'Africa/Casablanca')::date
    and session_date <= (now() at time zone 'Africa/Casablanca')::date + 60
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  );

-- Cancel your own sign-up for a session that hasn't passed.
drop policy if exists "training: cancel" on public.training_signups;
create policy "training: cancel" on public.training_signups
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and session_date >= (now() at time zone 'Africa/Casablanca')::date
  );

revoke all on public.training_signups from anon;

-- Public, anonymous counts per session (no names). Range capped at 60 days.
create or replace function public.training_counts(from_date date, to_date date)
returns table (session_date date, signups integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.session_date, count(*)::integer
  from public.training_signups s
  where s.session_date between from_date and least(to_date, from_date + 60)
  group by s.session_date
$$;

revoke all on function public.training_counts(date, date) from public;
grant execute on function public.training_counts(date, date) to anon, authenticated;
