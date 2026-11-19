-- Team draw: random teams, team names and jersey numbers for a match,
-- drawn in /admin (booked players + names typed by hand), kept on the match
-- so admin and captain see the same draw.
--
-- p_draw: {"teams": [{"name": "Vikings", "players": [{"name": "Yassine B.", "number": 7, "user_id": "…" | null}]}], "drawn_at": "…"}
-- With exactly 2 teams, the draw also sets the Direct screen: team names
-- (Équipe 1 / Équipe 2) and each booked player's team.

alter table public.matches add column if not exists team_draw jsonb;

create or replace function public.staff_save_draw(p_match_id text, p_draw jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  teams jsonb := p_draw -> 'teams';
  n integer;
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'forbidden';
  end if;
  if p_draw is null then
    update public.matches set team_draw = null where id = p_match_id;
    return;
  end if;
  if jsonb_typeof(teams) <> 'array' or length(p_draw::text) > 20000 then
    raise exception 'invalid_draw';
  end if;
  n := jsonb_array_length(teams);
  if n < 2 or n > 4 then
    raise exception 'invalid_draw';
  end if;

  update public.matches set team_draw = p_draw where id = p_match_id;

  if n = 2 then
    update public.matches
    set home_name = left(nullif(btrim(teams -> 0 ->> 'name'), ''), 40),
        away_name = left(nullif(btrim(teams -> 1 ->> 'name'), ''), 40)
    where id = p_match_id;

    update public.bookings b
    set team = case t.idx when 0 then 'home' else 'away' end
    from (
      select (tm.idx - 1)::integer as idx, (pl ->> 'user_id')::uuid as user_id
      from jsonb_array_elements(teams) with ordinality as tm(team, idx),
           jsonb_array_elements(tm.team -> 'players') as pl
      where pl ->> 'user_id' is not null
    ) t
    where b.match_id = p_match_id and b.user_id = t.user_id;
  end if;
end;
$$;
revoke all on function public.staff_save_draw(text, jsonb) from public, anon;
grant execute on function public.staff_save_draw(text, jsonb) to authenticated;
