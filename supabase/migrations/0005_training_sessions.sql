-- AJI TL3AB — training sign-ups per session (date + time), for sessions
-- listed in the Google Sheet's "Training" tab. Any day, any time, several
-- sessions per day. Existing sign-ups are kept (moved to 19:00 sessions).
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Requires 0002_training.sql. Safe to run again.

alter table public.training_signups add column if not exists session_id text;
alter table public.training_signups add column if not exists session_start timestamptz;

-- Existing rows were the fixed 19:00 sessions.
update public.training_signups
set session_start = (session_date + time '19:00') at time zone 'Africa/Casablanca'
where session_start is null;
update public.training_signups
set session_id = to_char(session_start at time zone 'Africa/Casablanca', 'YYYY-MM-DD-HH24:MI')
where session_id is null;

alter table public.training_signups alter column session_id set not null;
alter table public.training_signups alter column session_start set not null;

-- No more "mardi / jeudi / samedi only".
alter table public.training_signups drop constraint if exists training_signups_session_date_check;

-- One sign-up per player per session.
alter table public.training_signups drop constraint if exists training_signups_pkey;
alter table public.training_signups add constraint training_signups_pkey primary key (session_id, user_id);

-- The app only sends session_start; id and date are derived here so they
-- always match (id = "YYYY-MM-DD-HH:MM", Marrakech time).
create or replace function public.training_signups_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.session_id := to_char(new.session_start at time zone 'Africa/Casablanca', 'YYYY-MM-DD-HH24:MI');
  new.session_date := (new.session_start at time zone 'Africa/Casablanca')::date;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists training_signups_before_insert on public.training_signups;
create trigger training_signups_before_insert
  before insert on public.training_signups
  for each row execute function public.training_signups_before_insert();

-- Sign up for yourself, for a session that hasn't started (max 60 days
-- ahead), once your player profile exists.
drop policy if exists "training: sign up" on public.training_signups;
create policy "training: sign up" on public.training_signups
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and session_start > now()
    and session_start < now() + interval '60 days'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()))
  );

-- Cancel your own sign-up before the session starts.
drop policy if exists "training: cancel" on public.training_signups;
create policy "training: cancel" on public.training_signups
  for delete to authenticated
  using ((select auth.uid()) = user_id and session_start > now());

-- Public: number of sign-ups per session (never names).
create or replace function public.training_session_counts(p_session_ids text[])
returns table (session_id text, signups integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.session_id, count(*)::integer
  from public.training_signups s
  where s.session_id = any (p_session_ids[1:100])
  group by s.session_id
$$;

revoke all on function public.training_session_counts(text[]) from public;
grant execute on function public.training_session_counts(text[]) to anon, authenticated;
