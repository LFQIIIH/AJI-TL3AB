-- Full monthly ranking for /classement: points, matches, wins / draws /
-- losses, team goal difference, goals, assists, elections, current weekly
-- streak, form (last 5 results) and places gained or lost over 7 days.
-- Wins, draws, losses and goal difference need the player's team, set in
-- the Direct screen or by the team draw.

create or replace function public.ranking_table(p_month date, p_limit integer default 50)
returns table (
  rank integer, rank_change integer, name text, code text, player_position text,
  points integer, matches integer, wins integer, draws integer, losses integer, goal_diff integer,
  goals integer, assists integer, awards integer, week_streak integer, form text
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
         r.goals, r.assists, r.awards, public.week_streak(r.user_id), coalesce(t.form, '')
  from ranked r
  join public.profiles p on p.id = r.user_id
  left join before b on b.user_id = r.user_id
  left join team_stats t on t.user_id = r.user_id
  order by r.rk, r.matches desc, p.full_name
  limit least(greatest(p_limit, 1), 100)
$$;
revoke all on function public.ranking_table(date, integer) from public;
grant execute on function public.ranking_table(date, integer) to anon, authenticated;
