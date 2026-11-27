-- AJI TL3AB — "Pack Régulier": 4 match tickets (5v5 / 7v7) + 4 training
-- tickets for 325 MAD, valid 30 days. Separate from the wallet: tickets can
-- only be spent on a match or a training session.
-- The player pays the admin (cash / transfer), the admin activates the pack
-- in /admin/joueurs. Booking an eligible match or signing up for a training
-- session uses a ticket automatically (the +1 friend and shoe rental are still
-- paid from the wallet). Cancelling up to 24 h before gives the ticket back,
-- later it is lost. A match cancelled by the admin gives it back.
-- Requires 0001–0019. Safe to run again.

-- The offer (keep lib/packs.ts in sync: it's only the text shown on the site).
create or replace function public.pack_offer()
returns table (match_tickets integer, training_tickets integer, price_mad integer, list_price_mad integer,
               valid_days integer, formats text[])
language sql immutable set search_path = ''
as $$ select 4, 4, 325, 440, 30, array['5v5', '7v7'] $$;
grant execute on function public.pack_offer() to anon, authenticated;

create table if not exists public.player_packs (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  match_tickets     smallint not null check (match_tickets between 0 and 50),
  training_tickets  smallint not null check (training_tickets between 0 and 50),
  match_used        smallint not null default 0,
  training_used     smallint not null default 0,
  price_mad         integer not null check (price_mad between 0 and 100000),
  method            text check (method in ('cash', 'virement', 'whatsapp', 'autre')),
  note              text check (char_length(note) <= 200),
  expires_at        timestamptz not null,
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  cancelled_at      timestamptz,
  check (match_used between 0 and match_tickets),
  check (training_used between 0 and training_tickets)
);
create index if not exists player_packs_user_idx on public.player_packs (user_id, expires_at);
create index if not exists player_packs_created_idx on public.player_packs (created_at desc);
create index if not exists player_packs_created_by_idx on public.player_packs (created_by);

alter table public.player_packs enable row level security;
revoke all on public.player_packs from anon;
drop policy if exists "packs: read own or admin" on public.player_packs;
create policy "packs: read own or admin" on public.player_packs
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
-- No write policies: tickets only move through the functions below.

alter table public.bookings add column if not exists pack_id bigint references public.player_packs (id) on delete set null;
alter table public.training_signups add column if not exists pack_id bigint references public.player_packs (id) on delete set null;
create index if not exists bookings_pack_idx on public.bookings (pack_id) where pack_id is not null;
create index if not exists training_signups_pack_idx on public.training_signups (pack_id) where pack_id is not null;

-- Internal: use one ticket ('match' or 'training') of the player's pack that
-- expires first and is still valid at p_start. Returns the pack id, or null.
create or replace function public.pack_take(p_user uuid, p_kind text, p_start timestamptz)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid bigint;
begin
  select id into pid from public.player_packs
  where user_id = p_user and cancelled_at is null and expires_at > p_start and expires_at > now()
    and case p_kind when 'match' then match_used < match_tickets else training_used < training_tickets end
  order by expires_at, id
  limit 1
  for update;
  if pid is null then
    return null;
  end if;
  if p_kind = 'match' then
    update public.player_packs set match_used = match_used + 1 where id = pid;
  else
    update public.player_packs set training_used = training_used + 1 where id = pid;
  end if;
  return pid;
end;
$$;
revoke all on function public.pack_take(uuid, text, timestamptz) from public, anon, authenticated;

-- Internal: give a ticket back.
create or replace function public.pack_return(p_pack bigint, p_kind text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.player_packs
  set match_used = case when p_kind = 'match' then greatest(match_used - 1, 0) else match_used end,
      training_used = case when p_kind = 'training' then greatest(training_used - 1, 0) else training_used end
  where id = p_pack
$$;
revoke all on function public.pack_return(bigint, text) from public, anon, authenticated;

-- ───────────────────────── matches ─────────────────────────

-- Booking: an eligible match uses a ticket for the player's own place.
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
  pid bigint;
begin
  select * into m from public.matches where id = p_match_id;
  if not found then
    raise exception 'match_unavailable';
  end if;
  -- Lock the player's row: two bookings at the same moment can't spend the same balance.
  select trusted into is_trusted from public.profiles where id = p_user for update;
  if m.starts_at > now() and exists (select 1 from public.pack_offer() o where m.format = any (o.formats)) then
    pid := public.pack_take(p_user, 'match', m.starts_at);
  end if;
  price := case when pid is null then m.price_mad else 0 end + m.price_mad * p_guests
         + public.shoe_rental_mad() * ((p_shoe_size is not null)::int + (p_guest_shoe_size is not null)::int);
  if not coalesce(is_trusted, false) and public.wallet_balance(p_user) < price then
    raise exception 'insufficient_balance';
  end if;
  -- Capacity, date and shoe checks run in the bookings triggers (an error undoes the ticket too).
  insert into public.bookings (match_id, match_date, match_start, user_id, guests, shoe_size, guest_shoe_size, paid_mad, pack_id)
  values (p_match_id, (m.starts_at at time zone 'Africa/Casablanca')::date, m.starts_at, p_user, p_guests,
          p_shoe_size::smallint, p_guest_shoe_size::smallint, price, pid);
  if price > 0 then
    insert into public.wallet_transactions (user_id, amount_mad, kind, match_id, note)
    values (p_user, -price, 'booking', p_match_id, p_note);
  end if;
  return price;
end;
$$;
revoke all on function public.book_and_charge(uuid, text, integer, integer, integer, text) from public, anon, authenticated;

-- What cancelling now would give back (money and pack ticket).
drop function if exists public.cancellation_refund(text);
create function public.cancellation_refund(p_match_id text)
returns table (paid integer, refund integer, full_refund boolean, pack_ticket boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select b.paid_mad,
         case when b.paid_mad is null then 0
              when now() <= b.match_start - make_interval(hours => public.full_refund_hours()) then b.paid_mad
              else b.paid_mad / 2 end,
         now() <= b.match_start - make_interval(hours => public.full_refund_hours()),
         b.pack_id is not null
  from public.bookings b
  where b.match_id = p_match_id and b.user_id = auth.uid()
$$;
revoke all on function public.cancellation_refund(text) from public, anon;
grant execute on function public.cancellation_refund(text) to authenticated;

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
  late boolean;
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

  late := now() > b.match_start - make_interval(hours => public.full_refund_hours());
  if late then
    insert into public.late_cancellations (user_id, match_id, match_date) values (uid, p_match_id, b.match_date);
  end if;

  -- Pack ticket: back up to 24 h before, lost after.
  if b.pack_id is not null and not late then
    perform public.pack_return(b.pack_id, 'match');
  end if;

  if coalesce(b.paid_mad, 0) > 0 then
    refund := case when not late then b.paid_mad else b.paid_mad / 2 end;
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

-- A match cancelled by the admin: money and tickets back to everyone.
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
      if b.pack_id is not null then
        perform public.pack_return(b.pack_id, 'match');
      end if;
    end loop;
    delete from public.waitlist where match_id = new.id and promoted_at is null;
  end if;
  return new;
end;
$$;

-- ───────────────────────── training ─────────────────────────

-- Signing up uses a training ticket when the player has one (set here only:
-- whatever the app sends in pack_id is ignored).
create or replace function public.training_signups_use_pack()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.pack_id := public.pack_take(new.user_id, 'training', new.session_start);
  return new;
end;
$$;
drop trigger if exists training_signups_use_pack on public.training_signups;
create trigger training_signups_use_pack
  before insert on public.training_signups
  for each row execute function public.training_signups_use_pack();

-- Players can't move a ticket by editing their sign-up.
create or replace function public.training_signups_keep_pack()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.pack_id := old.pack_id;
  return new;
end;
$$;
drop trigger if exists training_signups_keep_pack on public.training_signups;
create trigger training_signups_keep_pack
  before update on public.training_signups
  for each row execute function public.training_signups_keep_pack();

-- Cancelling up to 24 h before gives the ticket back.
create or replace function public.training_signups_return_pack()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.pack_id is not null and now() <= old.session_start - make_interval(hours => public.full_refund_hours()) then
    perform public.pack_return(old.pack_id, 'training');
  end if;
  return old;
end;
$$;
drop trigger if exists training_signups_return_pack on public.training_signups;
create trigger training_signups_return_pack
  after delete on public.training_signups
  for each row execute function public.training_signups_return_pack();

-- ───────────────────────── player ─────────────────────────

-- The signed-in player's packs still running (expiry ahead, not cancelled).
create or replace function public.my_packs()
returns table (id bigint, match_left integer, training_left integer, match_tickets integer, training_tickets integer,
               expires_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, (k.match_tickets - k.match_used)::integer, (k.training_tickets - k.training_used)::integer,
         k.match_tickets::integer, k.training_tickets::integer, k.expires_at, k.created_at
  from public.player_packs k
  where k.user_id = auth.uid() and k.cancelled_at is null and k.expires_at > now()
  order by k.expires_at
$$;
revoke all on function public.my_packs() from public, anon;
grant execute on function public.my_packs() to authenticated;

-- ───────────────────────── admin ─────────────────────────

-- Activate a pack the player has paid. Returns its id.
create or replace function public.admin_activate_pack(p_user uuid, p_method text, p_note text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
  pid bigint;
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'profile_missing';
  end if;
  select * into o from public.pack_offer();
  insert into public.player_packs (user_id, match_tickets, training_tickets, price_mad, method, note, expires_at, created_by)
  values (p_user, o.match_tickets, o.training_tickets, o.price_mad, nullif(p_method, ''), nullif(btrim(p_note), ''),
          -- Valid until the end of the 30th day (Marrakech time).
          ((public.marrakech_today() + o.valid_days)::timestamp) at time zone 'Africa/Casablanca', auth.uid())
  returning id into pid;
  return pid;
end;
$$;
revoke all on function public.admin_activate_pack(uuid, text, text) from public, anon;
grant execute on function public.admin_activate_pack(uuid, text, text) to authenticated;

-- Undo a pack activated by mistake (tickets already used stay used).
create or replace function public.admin_cancel_pack(p_pack bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.player_packs set cancelled_at = now() where id = p_pack and cancelled_at is null;
end;
$$;
revoke all on function public.admin_cancel_pack(bigint) from public, anon;
grant execute on function public.admin_cancel_pack(bigint) to authenticated;

-- Pack sales (all, or one player's), newest first.
create or replace function public.admin_packs(p_user uuid default null, p_limit integer default 200)
returns table (id bigint, user_id uuid, full_name text, phone text, price_mad integer, method text, note text,
               match_used integer, match_tickets integer, training_used integer, training_tickets integer,
               created_at timestamptz, expires_at timestamptz, cancelled_at timestamptz, sold_by text)
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
    select k.id, k.user_id, p.full_name, p.phone, k.price_mad, k.method, k.note,
           k.match_used::integer, k.match_tickets::integer, k.training_used::integer, k.training_tickets::integer,
           k.created_at, k.expires_at, k.cancelled_at, s.full_name
    from public.player_packs k
    join public.profiles p on p.id = k.user_id
    left join public.profiles s on s.id = k.created_by
    where p_user is null or k.user_id = p_user
    order by k.created_at desc
    limit least(greatest(p_limit, 1), 500);
end;
$$;
revoke all on function public.admin_packs(uuid, integer) from public, anon;
grant execute on function public.admin_packs(uuid, integer) to authenticated;

-- Roster: show who played with a pack ticket.
drop function if exists public.staff_match_roster(text);
create function public.staff_match_roster(p_match_id text)
returns table (
  user_id uuid, player_name text, phone text, player_position text, status text,
  guests integer, shoe_size integer, guest_shoe_size integer,
  attended boolean, goals integer, created_at timestamptz, paid_mad integer, team text, assists integer, with_pack boolean
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
           b.attended, b.goals::integer, b.created_at, b.paid_mad, b.team, b.assists::integer, b.pack_id is not null
    from public.bookings b
    left join public.profiles p on p.id = b.user_id
    where b.match_id = p_match_id
    union all
    select w.user_id, coalesce(p.full_name, w.player_name), p.phone, p.position, 'waiting'::text,
           0, null::integer, null::integer, null::boolean, null::integer, w.created_at, null::integer, null::text, null::integer, false
    from public.waitlist w
    left join public.profiles p on p.id = w.user_id
    where w.match_id = p_match_id and w.promoted_at is null
    order by 5, 11;
end;
$$;
revoke all on function public.staff_match_roster(text) from public, anon;
grant execute on function public.staff_match_roster(text) to authenticated;

-- ───────────────────────── notifications ─────────────────────────

-- Same as 0018, plus 5: "Ton pack expire dans 5 jours".
create or replace function public.push_take_due()
returns table (user_id uuid, title text, body text, url text, tag text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  fresh integer;
  week_start date := date_trunc('week', public.marrakech_today())::date;
  local_now timestamp := now() at time zone 'Africa/Casablanca';
begin
  -- 1. New matches online (one message per run, however many matches).
  with visible as (
    select m.id from public.matches m
    where m.status = 'published' and m.starts_at > now() and (m.publish_at is null or m.publish_at <= now())
      and not exists (select 1 from public.push_announced a where a.match_id = m.id)
  ), ins as (insert into public.push_announced (match_id) select id from visible on conflict do nothing returning 1)
  select count(*) into fresh from ins;
  if fresh > 0 then
    return query
      select distinct s.user_id,
             case when fresh = 1 then '⚽ Nouveau match dispo' else format('⚽ %s nouveaux matchs dispo', fresh) end,
             'Réserve vite ta place sur AJI TL3AB.'::text, '/jouer'::text, 'new-matches'::text
      from public.push_subscriptions s;
  end if;

  -- 2. Match card ready (score entered), 3. vote open (1 h after kick-off).
  return query
    with due as (
      select b.user_id, 'card'::text as kind, b.match_id as ref
      from public.bookings b join public.matches m on m.id = b.match_id
      where b.attended and m.home_score is not null and m.away_score is not null
        and b.match_start between now() - interval '3 days' and now() - interval '1 hour'
      union all
      select b.user_id, 'vote', b.match_id
      from public.bookings b
      where b.attended and b.match_start between now() - interval '3 hours' and now() - interval '1 hour'
    ), fresh_due as (
      insert into public.push_log (kind, ref, user_id)
      select d.kind, d.ref, d.user_id from due d
      where exists (select 1 from public.push_subscriptions s where s.user_id = d.user_id)
      on conflict do nothing
      returning push_log.kind, push_log.ref, push_log.user_id
    )
    select f.user_id,
           case f.kind when 'card' then '📸 Ta carte du match est prête' else '🗳️ Vote ouvert : qui a brillé ?' end,
           case f.kind when 'card' then 'Score, points gagnés, niveau : regarde et partage-la.' else 'Élis le meilleur gardien, défenseur et milieu de ton match.' end,
           case f.kind when 'card' then '/compte?recap=' || f.ref else '/compte' end,
           f.kind || '-' || f.ref
    from fresh_due f;

  -- 4. Thursday from 18:00: weekly streak at stake (no match booked this week yet).
  if extract(isodow from local_now) = 4 and extract(hour from local_now) >= 18 then
    return query
      with due as (
        select distinct s.user_id, public.week_streak(s.user_id) as streak
        from public.push_subscriptions s
        where not exists (select 1 from public.bookings b where b.user_id = s.user_id and b.match_date >= week_start)
      ), fresh_due as (
        insert into public.push_log (kind, ref, user_id)
        select 'streak', week_start::text, d.user_id from due d where d.streak >= 2
        on conflict do nothing
        returning push_log.user_id
      )
      select f.user_id, format('🔥 Ta série de %s semaines est en jeu', public.week_streak(f.user_id)),
             'Réserve un match cette semaine pour la garder.'::text, '/jouer'::text, 'streak'::text
      from fresh_due f;
  end if;

  -- 5. Pack expiring in 5 days or less with tickets left (once per pack).
  return query
    with due as (
      select k.id, k.user_id, k.expires_at, (k.match_tickets - k.match_used) as ml, (k.training_tickets - k.training_used) as tl
      from public.player_packs k
      where k.cancelled_at is null and k.expires_at > now() and k.expires_at <= now() + interval '5 days'
        and (k.match_used < k.match_tickets or k.training_used < k.training_tickets)
        and exists (select 1 from public.push_subscriptions s where s.user_id = k.user_id)
    ), fresh_due as (
      insert into public.push_log (kind, ref, user_id)
      select 'pack', d.id::text, d.user_id from due d
      on conflict do nothing
      returning push_log.ref, push_log.user_id
    )
    select f.user_id,
           format('⏳ Ton pack expire dans %s jour%s', greatest(1, ceil(extract(epoch from d.expires_at - now()) / 86400)::int),
                  case when ceil(extract(epoch from d.expires_at - now()) / 86400) > 1 then 's' else '' end),
           format('Il te reste %s : réserve avant le %s.',
                  concat_ws(' et ',
                    case when d.ml > 0 then d.ml || ' match' || case when d.ml > 1 then 's' else '' end end,
                    case when d.tl > 0 then d.tl || ' training' || case when d.tl > 1 then 's' else '' end end),
                  to_char((d.expires_at at time zone 'Africa/Casablanca') - interval '1 second', 'DD/MM')),
           case when d.ml > 0 then '/jouer' else '/prepa-physique' end, 'pack-' || f.ref
    from fresh_due f join due d on d.id::text = f.ref and d.user_id = f.user_id;
end;
$$;
revoke all on function public.push_take_due() from public, anon, authenticated;
