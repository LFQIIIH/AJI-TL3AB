-- 1. Covering indexes for foreign keys (Supabase performance advisor).
create index if not exists draws_winner_id_idx on public.draws (winner_id);
create index if not exists match_events_assist_id_idx on public.match_events (assist_id);
create index if not exists match_events_created_by_idx on public.match_events (created_by);
create index if not exists match_events_user_id_idx on public.match_events (user_id);
create index if not exists match_feedback_user_id_idx on public.match_feedback (user_id);
create index if not exists matches_captain_id_idx on public.matches (captain_id);
create index if not exists matches_pitch_id_idx on public.matches (pitch_id);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);
create index if not exists switchoff_signups_user_id_idx on public.switchoff_signups (user_id);
create index if not exists training_signups_user_id_idx on public.training_signups (user_id);
create index if not exists votes_voter_id_idx on public.votes (voter_id);
create index if not exists waitlist_user_id_idx on public.waitlist (user_id);
create index if not exists wallet_transactions_created_by_idx on public.wallet_transactions (created_by);

-- 2. Error log: errors seen by visitors (browser) and by the server, shown in /admin/erreurs.
create table if not exists public.app_errors (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source     text not null check (source in ('client', 'server')),
  message    text not null,
  url        text,
  detail     text,
  user_agent text,
  user_id    uuid
);
create index if not exists app_errors_created_at_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;

drop policy if exists "app_errors: admin read" on public.app_errors;
create policy "app_errors: admin read" on public.app_errors for select to authenticated using (public.is_admin());
drop policy if exists "app_errors: admin delete" on public.app_errors;
create policy "app_errors: admin delete" on public.app_errors for delete to authenticated using (public.is_admin());
grant select, delete on public.app_errors to authenticated;

-- Anyone may report (the site does it automatically); short texts, and at most
-- 300 reports an hour in total so a broken loop or a spammer can't fill the table.
create or replace function public.log_app_error(p_source text, p_message text, p_url text default null, p_detail text default null, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_source not in ('client', 'server') or coalesce(btrim(p_message), '') = '' then
    return;
  end if;
  if (select count(*) from public.app_errors where created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;
  insert into public.app_errors (source, message, url, detail, user_agent, user_id)
  values (p_source, left(p_message, 500), left(p_url, 300), left(p_detail, 2000), left(p_user_agent, 300), auth.uid());
  -- Keep 90 days.
  delete from public.app_errors where created_at < now() - interval '90 days';
end;
$$;
revoke all on function public.log_app_error(text, text, text, text, text) from public;
grant execute on function public.log_app_error(text, text, text, text, text) to anon, authenticated;

-- 3. Site photos: public bucket, filled by the admin in /admin/photos, shown on the homepage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site-photos: admin upload" on storage.objects;
create policy "site-photos: admin upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-photos' and public.is_admin());
drop policy if exists "site-photos: admin delete" on storage.objects;
create policy "site-photos: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'site-photos' and public.is_admin());
drop policy if exists "site-photos: admin read" on storage.objects;
create policy "site-photos: admin read" on storage.objects
  for select to authenticated using (bucket_id = 'site-photos' and public.is_admin());

-- Newest first, for the homepage (public files, no listing permission needed).
create or replace function public.site_photos(p_limit integer default 12)
returns table (name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, o.created_at from storage.objects o
  where o.bucket_id = 'site-photos' and o.name not like '%/.emptyFolderPlaceholder'
  order by o.created_at desc
  limit least(greatest(p_limit, 1), 24)
$$;
revoke all on function public.site_photos(integer) from public;
grant execute on function public.site_photos(integer) to anon, authenticated;
