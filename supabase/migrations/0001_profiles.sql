-- AJI TL3AB — player profiles.
-- Run once in Supabase: SQL Editor → New query → paste → Run.
--
-- Privacy: Row Level Security lets each signed-in player read and edit ONLY
-- their own row. Nobody else (other players, visitors) can read phone numbers.
-- You still see everything from the Supabase dashboard (Table Editor).

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(btrim(full_name)) between 2 and 80),
  -- E.164, e.g. +212612345678
  phone       text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  position    text not null check (position in ('gardien', 'defenseur', 'milieu', 'attaquant')),
  -- when the player accepted the privacy notice (loi 09-08)
  consent_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Logged-out visitors get no access at all (RLS would already return nothing).
revoke all on public.profiles from anon;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
