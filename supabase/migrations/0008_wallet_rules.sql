-- AJI TL3AB — Phase 1: rules, complete profile, prepaid wallet, cancellation
-- rules and paid waiting list. Requires 0001–0007. Safe to run again.
--
-- Wallet: every player has a balance in MAD (sum of wallet_transactions).
-- The admin records top-ups (WhatsApp / bank transfer / cash) in /admin.
-- Booking a match (+1 friend, shoe rental) is paid from the balance by
-- book_match(); "trusted" players may go below zero and pay on site.
-- Cancelling: 100 % back to the wallet up to 24 h before kick-off, 50 % after.
-- A match cancelled by the admin is refunded 100 % to everyone.
-- When a place frees up, the first waiting players who can pay are booked
-- and charged automatically.

-- ───────────────────────── settings ─────────────────────────

create or replace function public.rules_version() returns integer
language sql immutable set search_path = '' as $$ select 1 $$;

create or replace function public.shoe_rental_mad() returns integer
language sql immutable set search_path = '' as $$ select 20 $$;

create or replace function public.full_refund_hours() returns integer
language sql immutable set search_path = '' as $$ select 24 $$;

grant execute on function public.rules_version() to anon, authenticated;

-- ───────────────────────── profile ─────────────────────────

alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists level text;
alter table public.profiles add column if not exists preferred_foot text;
alter table public.profiles add column if not exists rules_version integer;
alter table public.profiles add column if not exists rules_accepted_at timestamptz;
-- Admin only: may book with an empty balance and pay on site.
alter table public.profiles add column if not exists trusted boolean not null default false;

alter table public.profiles drop constraint if exists profiles_birth_date_check;
alter table public.profiles add constraint profiles_birth_date_check
  check (birth_date is null or birth_date between date '1940-01-01' and date '2022-12-31');
alter table public.profiles drop constraint if exists profiles_level_check;
alter table public.profiles add constraint profiles_level_check
  check (level is null or level in ('debutant', 'intermediaire', 'confirme'));
alter table public.profiles drop constraint if exists profiles_preferred_foot_check;
alter table public.profiles add constraint profiles_preferred_foot_check
  check (preferred_foot is null or preferred_foot in ('droit', 'gauche', 'les_deux'));

-- Players can't make themselves "trusted".
create or replace function public.profiles_protect_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() is null in the SQL Editor (the owner): allowed too.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.trusted := false;
  else
    new.trusted := old.trusted;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin_fields on public.profiles;
create trigger profiles_protect_admin_fields
  before insert or update on public.profiles
  for each row execute function public.profiles_protect_admin_fields();

-- The signed-in player accepts the current rules.
create or replace function public.accept_rules()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set rules_version = public.rules_version(), rules_accepted_at = now()
  where id = auth.uid();
  if not found then
    raise exception 'profile_missing';
  end if;
end;
$$;

revoke all on function public.accept_rules() from public, anon;
grant execute on function public.accept_rules() to authenticated;

-- ───────────────────────── wallet ─────────────────────────

create table if not exists public.wallet_transactions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  amount_mad  integer not null check (amount_mad <> 0 and amount_mad between -100000 and 100000),
  kind        text not null check (kind in ('topup', 'booking', 'refund', 'adjustment')),
  method      text check (method in ('cash', 'virement', 'whatsapp', 'autre')),
  match_id    text,
  note        text check (char_length(note) <= 200),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists wallet_tx_user_idx on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;
revoke all on public.wallet_transactions from anon;

drop policy if exists "wallet: read own or admin" on public.wallet_transactions;
create policy "wallet: read own or admin" on public.wallet_transactions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
-- No write policies: money only moves through the functions below.

create or replace function public.wallet_balance(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(amount_mad), 0)::integer from public.wallet_transactions where user_id = p_user
$$;
revoke all on function public.wallet_balance(uuid) from public, anon, authenticated;

-- The signed-in player's balance and whether they're trusted.
create or replace function public.my_wallet()
returns table (balance integer, trusted boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select public.wallet_balance(p.id), p.trusted from public.profiles p where p.id = auth.uid()
$$;
revoke all on function public.my_wallet() from public, anon;
grant execute on function public.my_wallet() to authenticated;

-- Bookings remember what was paid (null = older bookings, paid on site).
alter table public.bookings add column if not exists paid_mad integer check (paid_mad is null or paid_mad >= 0);

-- ───────────────────────── booking (paid) ─────────────────────────

-- Players no longer insert bookings directly: book_match() checks the
-- profile, the rules and the balance, then books and charges in one go.
drop policy if exists "bookings: book own" on public.bookings;

create or replace function public.profile_ready(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.id is null then 'profile_missing'
    when p.birth_date is null or p.level is null then 'profile_incomplete'
    when coalesce(p.rules_version, 0) < public.rules_version() then 'rules_not_accepted'
    else 'ok'
  end
  from (select 1) x left join public.profiles p on p.id = p_user
$$;
revoke all on function public.profile_ready(uuid) from public, anon;
grant execute on function public.profile_ready(uuid) to authenticated;

-- Internal: book a player (+ friend, + shoes) on a database match and charge them.
create or replace function public.book_and_charge(
  p_user uuid, p_match_id text, p_guests integer, p_shoe_size integer, p_guest_shoe_size integer, p_note text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  price integer;
  is_trusted boolean;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then
    raise exception 'match_unavailable';
  end if;
  price := m.price_mad * (1 + p_guests)
         + public.shoe_rental_mad() * ((p_shoe_size is not null)::int + (p_guest_shoe_size is not null)::int);
  -- Lock the player's row: two bookings at the same moment can't spend the same balance.
  select trusted into is_trusted from public.profiles where id = p_user for update;
  if not coalesce(is_trusted, false) and public.wallet_balance(p_user) < price then
    raise exception 'insufficient_balance';
  end if;
  -- Capacity, date and shoe checks run in the bookings triggers.
  insert into public.bookings (match_id, match_date, match_start, user_id, guests, shoe_size, guest_shoe_size, paid_mad)
  values (p_match_id, (m.starts_at at time zone 'Africa/Casablanca')::date, m.starts_at, p_user, p_guests,
          p_shoe_size::smallint, p_guest_shoe_size::smallint, price);
  if price > 0 then
    insert into public.wallet_transactions (user_id, amount_mad, kind, match_id, note)
    values (p_user, -price, 'booking', p_match_id, p_note);
  end if;
  return price;
end;
$$;
revoke all on function public.book_and_charge(uuid, text, integer, integer, integer, text) from public, anon, authenticated;

-- The signed-in player books a match (+1 friend, shoe sizes). Returns the price paid.
create or replace function public.book_match(
  p_match_id text, p_guests integer default 0, p_shoe_size integer default null, p_guest_shoe_size integer default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ready text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  ready := public.profile_ready(uid);
  if ready <> 'ok' then
    raise exception '%', ready;
  end if;
  if p_guests not in (0, 1) or (p_guest_shoe_size is not null and p_guests = 0) then
    raise exception 'invalid_booking';
  end if;
  return public.book_and_charge(uid, p_match_id, p_guests, p_shoe_size, p_guest_shoe_size, null);
end;
$$;
revoke all on function public.book_match(text, integer, integer, integer) from public, anon;
grant execute on function public.book_match(text, integer, integer, integer) to authenticated;

-- What cancelling now would give back (for the confirmation message).
create or replace function public.cancellation_refund(p_match_id text)
returns table (paid integer, refund integer, full_refund boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select b.paid_mad,
         case when b.paid_mad is null then 0
              when now() <= b.match_start - make_interval(hours => public.full_refund_hours()) then b.paid_mad
              else b.paid_mad / 2 end,
         now() <= b.match_start - make_interval(hours => public.full_refund_hours())
  from public.bookings b
  where b.match_id = p_match_id and b.user_id = auth.uid()
$$;
revoke all on function public.cancellation_refund(text) from public, anon;
grant execute on function public.cancellation_refund(text) to authenticated;

-- Internal: give freed places to the first waiting players who can pay.
create or replace function public.promote_waitlist(p_match_id text, p_places integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.waitlist;
  promoted integer := 0;
begin
  for w in
    select * from public.waitlist
    where match_id = p_match_id and promoted_at is null
    order by created_at
    for update skip locked
  loop
    exit when promoted >= p_places;
    begin
      perform public.book_and_charge(w.user_id, p_match_id, 0, null, null, 'Place libérée (liste d''attente)');
      update public.waitlist set promoted_at = now() where match_id = w.match_id and user_id = w.user_id;
      promoted := promoted + 1;
    exception when others then
      -- Can't pay / no room: next player (they stay on the list).
      continue;
    end;
  end loop;
  return promoted;
end;
$$;
revoke all on function public.promote_waitlist(text, integer) from public, anon, authenticated;

-- Cancel your booking: refund to the wallet (100 % up to 24 h before, 50 %
-- after), then the freed places go to the waiting list. Returns how many
-- waiting players were booked.
create or replace function public.cancel_booking(p_match_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  b public.bookings;
  refund integer;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.bookings
  where match_id = p_match_id and user_id = uid and match_start > now()
  returning * into b;
  if not found then
    raise exception 'no_booking';
  end if;

  if coalesce(b.paid_mad, 0) > 0 then
    refund := case when now() <= b.match_start - make_interval(hours => public.full_refund_hours())
                   then b.paid_mad else b.paid_mad / 2 end;
    if refund > 0 then
      insert into public.wallet_transactions (user_id, amount_mad, kind, match_id, note)
      values (uid, refund, 'refund', p_match_id,
              case when refund = b.paid_mad then 'Annulation (remboursement 100 %)' else 'Annulation tardive (remboursement 50 %)' end);
    end if;
  end if;

  return public.promote_waitlist(p_match_id, 1 + b.guests);
end;
$$;

revoke all on function public.cancel_booking(text) from public, anon;
grant execute on function public.cancel_booking(text) to authenticated;

-- A match cancelled by the admin: everyone refunded 100 %, bookings and
-- waiting list cleared.
create or replace function public.matches_cancel_refund()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    for b in delete from public.bookings where match_id = new.id returning * loop
      if coalesce(b.paid_mad, 0) > 0 then
        insert into public.wallet_transactions (user_id, amount_mad, kind, match_id, note)
        values (b.user_id, b.paid_mad, 'refund', new.id, 'Match annulé (remboursement 100 %)');
      end if;
    end loop;
    delete from public.waitlist where match_id = new.id and promoted_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists matches_cancel_refund on public.matches;
create trigger matches_cancel_refund
  after update of status on public.matches
  for each row execute function public.matches_cancel_refund();

-- ───────────────────────── admin: players & wallets ─────────────────────────

create or replace function public.admin_players(p_search text default '')
returns table (
  user_id uuid, full_name text, phone text, level text, trusted boolean,
  balance integer, bookings integer, last_match timestamptz, created_at timestamptz
)
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
           p.created_at
    from public.profiles p
    -- Name, or phone digits ("06 12…" matches "+2126 12…": leading zeros dropped).
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

-- Record a top-up (positive) or a correction (negative) on a player's wallet.
create or replace function public.admin_wallet_add(p_user uuid, p_amount integer, p_method text, p_note text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 100000 then
    raise exception 'invalid_amount';
  end if;
  insert into public.wallet_transactions (user_id, amount_mad, kind, method, note, created_by)
  values (p_user, p_amount, case when p_amount > 0 then 'topup' else 'adjustment' end,
          nullif(p_method, ''), nullif(btrim(p_note), ''), auth.uid());
  return public.wallet_balance(p_user);
end;
$$;
revoke all on function public.admin_wallet_add(uuid, integer, text, text) from public, anon;
grant execute on function public.admin_wallet_add(uuid, integer, text, text) to authenticated;

create or replace function public.admin_set_trusted(p_user uuid, p_trusted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.profiles set trusted = coalesce(p_trusted, false) where id = p_user;
end;
$$;
revoke all on function public.admin_set_trusted(uuid, boolean) from public, anon;
grant execute on function public.admin_set_trusted(uuid, boolean) to authenticated;

-- Roster now also shows what each player paid.
drop function if exists public.staff_match_roster(text);
create function public.staff_match_roster(p_match_id text)
returns table (
  user_id uuid, player_name text, phone text, player_position text, status text,
  guests integer, shoe_size integer, guest_shoe_size integer,
  attended boolean, goals integer, created_at timestamptz, paid_mad integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_match(p_match_id) then
    raise exception 'forbidden';
  end if;
  return query
    select b.user_id, coalesce(p.full_name, b.player_name), p.phone, p.position, 'booked'::text,
           b.guests::integer, b.shoe_size::integer, b.guest_shoe_size::integer,
           b.attended, b.goals::integer, b.created_at, b.paid_mad
    from public.bookings b
    left join public.profiles p on p.id = b.user_id
    where b.match_id = p_match_id
    union all
    select w.user_id, coalesce(p.full_name, w.player_name), p.phone, p.position, 'waiting'::text,
           0, null::integer, null::integer, null::boolean, null::integer, w.created_at, null::integer
    from public.waitlist w
    left join public.profiles p on p.id = w.user_id
    where w.match_id = p_match_id and w.promoted_at is null
    order by 5, 11;
end;
$$;
revoke all on function public.staff_match_roster(text) from public, anon;
grant execute on function public.staff_match_roster(text) to authenticated;
