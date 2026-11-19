-- Fix (0011): profiles.public_code defaulted to new_public_code(), which
-- players may not execute, so every profile insert / upsert from the site
-- failed with 42501 "permission denied for function new_public_code".
-- The code is now set by a SECURITY DEFINER trigger: generated on creation,
-- never chosen or changed by the player.

alter table public.profiles alter column public_code drop default;

create or replace function public.profiles_public_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.public_code := public.new_public_code();
  else
    new.public_code := old.public_code;
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_public_code() from public, anon, authenticated;

drop trigger if exists profiles_public_code on public.profiles;
create trigger profiles_public_code
  before insert or update on public.profiles
  for each row execute function public.profiles_public_code();
