-- Player profile photo: required to create an account (players only), stored
-- in the public "avatars" bucket under the player's own folder; shown on public
-- profiles, the ranking, match rosters and player search (public profiles only).

alter table public.profiles add column if not exists avatar_path text;
do $$ begin
  alter table public.profiles add constraint profiles_avatar_path_own
    check (avatar_path is null or (avatar_path like id::text || '/%' and avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'));
exception when duplicate_object then null; end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Players write only in their own folder ("<user id>/…"); the admin may remove any photo.
drop policy if exists "avatars: own upload" on storage.objects;
create policy "avatars: own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);
drop policy if exists "avatars: own read" on storage.objects;
create policy "avatars: own read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (split_part(name, '/', 1) = (select auth.uid())::text or public.is_admin()));
drop policy if exists "avatars: own delete" on storage.objects;
create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (split_part(name, '/', 1) = (select auth.uid())::text or public.is_admin()));

-- Booking needs the photo too (counts as an incomplete profile).
create or replace function public.profile_ready(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.id is null then 'profile_missing'
    when p.birth_date is null or p.level is null or p.avatar_path is null then 'profile_incomplete'
    when coalesce(p.rules_version, 0) < public.rules_version() then 'rules_not_accepted'
    else 'ok'
  end
  from (select 1) x left join public.profiles p on p.id = p_user
$$;

-- Admin: remove an inappropriate photo (the player must add a new one before booking).
create or replace function public.admin_remove_avatar(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  old text;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  select avatar_path into old from public.profiles where id = p_user;
  update public.profiles set avatar_path = null where id = p_user;
  return old;
end;
$$;
revoke all on function public.admin_remove_avatar(uuid) from public, anon;
grant execute on function public.admin_remove_avatar(uuid) to authenticated;

drop function if exists public.admin_players(text);
create function public.admin_players(p_search text default '')
returns table (user_id uuid, full_name text, phone text, level text, trusted boolean, balance integer, bookings integer,
               last_match timestamptz, created_at timestamptz, avatar text)
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
    select p.id, p.full_name, p.phone, p.level, p.trusted,
           public.wallet_balance(p.id),
           (select count(*)::integer from public.bookings b where b.user_id = p.id),
           (select max(b.match_start) from public.bookings b where b.user_id = p.id),
           p.created_at, p.avatar_path
    from public.profiles p
    where coalesce(btrim(p_search), '') = ''
       or p.full_name ilike '%' || btrim(p_search) || '%'
       or (length(ltrim(regexp_replace(p_search, '[^0-9]', '', 'g'), '0')) >= 4
           and p.phone like '%' || ltrim(regexp_replace(p_search, '[^0-9]', '', 'g'), '0') || '%')
    order by p.full_name
    limit 100;
end;
$$;
revoke all on function public.admin_players(text) from public, anon;
grant execute on function public.admin_players(text) to authenticated;

drop function if exists public.ranking_table(date, integer);
create function public.ranking_table(p_month date, p_limit integer default 50)
returns table (
  rank integer, rank_change integer, name text, code text, player_position text,
  points integer, matches integer, wins integer, draws integer, losses integer, goal_diff integer,
  goals integer, assists integer, awards integer, week_streak integer, form text, avatar text
)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select date_trunc('month', p_month)::date as m_from,
           least((date_trunc('month', p_month) + interval '1 month - 1 day')::date, public.marrakech_today()) as m_to
  ),
  now_pts as (
    select pp.* from bounds, public.player_points(bounds.m_from, (date_trunc('month', p_month) + interval '1 month - 1 day')::date) pp
    where pp.matches > 0
  ),
  ranked as (
    select n.*, rank() over (order by n.points desc)::integer as rk from now_pts n
  ),
  -- Ranking 7 days ago, inside the same month (none during the first week).
  before as (
    select pp.user_id, rank() over (order by pp.points desc)::integer as rk
    from bounds, public.player_points(bounds.m_from, bounds.m_to - 7) pp
    where pp.matches > 0 and bounds.m_to - 7 >= bounds.m_from
  ),
  results as (
    select b.user_id, b.match_start,
           case when b.team = 'home' then m.home_score - m.away_score else m.away_score - m.home_score end as diff
    from bounds
    join public.bookings b on b.match_date between bounds.m_from and bounds.m_to
    join public.matches m on m.id = b.match_id
    where b.attended and b.match_start < now() and b.team is not null
      and m.home_score is not null and m.away_score is not null and m.status <> 'cancelled'
  ),
  team_stats as (
    select user_id,
           count(*) filter (where diff < 0)::integer as losses,
           coalesce(sum(diff), 0)::integer as goal_diff,
           (select string_agg(case when r2.diff > 0 then 'V' when r2.diff = 0 then 'N' else 'D' end, '' order by r2.match_start)
              from (select r1.diff, r1.match_start from results r1 where r1.user_id = r.user_id order by r1.match_start desc limit 5) r2) as form
    from results r
    group by user_id
  )
  select r.rk, (b.rk - r.rk)::integer, public.public_name(p.full_name),
         case when p.public_profile then p.public_code end, p.position,
         r.points, r.matches, r.wins, r.draws, coalesce(t.losses, 0), coalesce(t.goal_diff, 0),
         r.goals, r.assists, r.awards, public.week_streak(r.user_id), coalesce(t.form, ''),
         case when p.public_profile then p.avatar_path end
  from ranked r
  join public.profiles p on p.id = r.user_id
  left join before b on b.user_id = r.user_id
  left join team_stats t on t.user_id = r.user_id
  order by r.rk, r.matches desc, p.full_name
  limit least(greatest(p_limit, 1), 100)
$$;
revoke all on function public.ranking_table(date, integer) from public;
grant execute on function public.ranking_table(date, integer) to anon, authenticated;

drop function if exists public.player_profile(text);
create function public.player_profile(p_code text)
returns table (
  code text, name text, player_position text, member_since date,
  points_total integer, points_month integer, rank_month integer,
  matches integer, wins integer, goals integer, assists integer, awards integer,
  best_match_goals integer, week_streak integer, yellow integer, red integer,
  referrals_played integer, recent jsonb, avatar text
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
         coalesce((select items from recent), '[]'::jsonb),
         p.avatar_path
  from p
  left join total t on true
  left join month_all ma on ma.user_id = p.id
$$;
revoke all on function public.player_profile(text) from public;
grant execute on function public.player_profile(text) to anon, authenticated;

drop function if exists public.search_players(text);
create function public.search_players(p_query text)
returns table (code text, name text, player_position text, matches integer, avatar text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.public_code, public.public_name(p.full_name), p.position,
         (select count(*)::integer from public.bookings b where b.user_id = p.id and b.attended and b.match_start < now()),
         p.avatar_path
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

drop function if exists public.public_match_roster(text);
create function public.public_match_roster(p_match_id text)
returns table (name text, code text, team text, goals integer, assists integer, avatar text)
language sql
stable
security definer
set search_path = ''
as $$
  select public.public_name(p.full_name), case when p.public_profile then p.public_code end, b.team, b.goals::integer, b.assists::integer,
         case when p.public_profile then p.avatar_path end
  from public.bookings b
  join public.profiles p on p.id = b.user_id
  join public.matches m on m.id = b.match_id
  where b.match_id = p_match_id and b.attended and m.status = 'published' and m.starts_at <= now()
  order by case b.team when 'home' then 0 when 'away' then 1 else 2 end, b.goals desc, p.full_name
$$;
revoke all on function public.public_match_roster(text) from public;
grant execute on function public.public_match_roster(text) to anon, authenticated;
