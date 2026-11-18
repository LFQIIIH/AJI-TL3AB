-- Match cards: initials of the first players booked on each match ("Y", "K"…),
-- only for players whose profile is public. No names, no ids.
create or replace function public.match_booked_initials(p_match_ids text[])
returns table (match_id text, initial text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.match_id, r.initial
  from (
    select b.match_id,
           upper(left(btrim(p.full_name), 1)) as initial,
           row_number() over (partition by b.match_id order by b.created_at) as n
    from public.bookings b
    join public.profiles p on p.id = b.user_id
    where b.match_id = any (p_match_ids[1:100]) and p.public_profile and btrim(coalesce(p.full_name, '')) <> ''
  ) r
  where r.n <= 4
  order by r.match_id, r.n
$$;
revoke all on function public.match_booked_initials(text[]) from public;
grant execute on function public.match_booked_initials(text[]) to anon, authenticated;
