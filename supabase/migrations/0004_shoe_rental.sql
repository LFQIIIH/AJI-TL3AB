-- AJI TL3AB — shoe rental with match bookings.
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Requires 0003_community.sql. Safe to run again.
--
-- Turf shoes, sizes 38–45, 2 pairs per size, 20 MAD per match (price is
-- shown by the site). A pair is brought only if it was reserved with a
-- booking. Admin: see bookings.shoe_size / guest_shoe_size per match.

alter table public.bookings add column if not exists shoe_size smallint
  check (shoe_size between 38 and 45);
-- For the +1 friend (only with guests = 1).
alter table public.bookings add column if not exists guest_shoe_size smallint
  check (guest_shoe_size between 38 and 45);

alter table public.bookings drop constraint if exists bookings_guest_shoe_needs_guest;
alter table public.bookings add constraint bookings_guest_shoe_needs_guest
  check (guest_shoe_size is null or guests = 1);

-- Pairs available per size, per match.
create or replace function public.shoe_pairs_per_size()
returns integer language sql immutable set search_path = '' as $$ select 2 $$;

-- Refuse a booking that would need a pair that's already taken.
-- security definer: must count other players' rentals, which RLS hides.
create or replace function public.bookings_check_shoes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  size smallint;
  used integer;
  wanted integer;
begin
  foreach size in array array_remove(array[new.shoe_size, new.guest_shoe_size], null) loop
    select count(*) filter (where b.shoe_size = size) + count(*) filter (where b.guest_shoe_size = size)
      into used
      from public.bookings b
      where b.match_id = new.match_id
        and not (tg_op = 'UPDATE' and b.match_id = old.match_id and b.user_id = old.user_id);
    wanted := (new.shoe_size is not distinct from size)::int + (new.guest_shoe_size is not distinct from size)::int;
    if used + wanted > public.shoe_pairs_per_size() then
      raise exception 'shoes_unavailable' using detail = 'size ' || size;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists bookings_check_shoes on public.bookings;
create trigger bookings_check_shoes
  before insert or update of shoe_size, guest_shoe_size on public.bookings
  for each row execute function public.bookings_check_shoes();

-- Public: pairs left per size for a match (counts only, no names).
create or replace function public.match_shoe_availability(p_match_id text)
returns table (size integer, pairs_left integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s, greatest(0, public.shoe_pairs_per_size() - (
    select count(*) filter (where b.shoe_size = s) + count(*) filter (where b.guest_shoe_size = s)
    from public.bookings b where b.match_id = p_match_id
  ))::integer
  from generate_series(38, 45) s
  order by s
$$;

revoke all on function public.match_shoe_availability(text) from public;
grant execute on function public.match_shoe_availability(text) to anon, authenticated;
