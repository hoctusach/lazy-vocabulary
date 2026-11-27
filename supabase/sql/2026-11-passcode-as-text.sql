-- Store the passcode exactly as the user typed it (text), so "0123" and "00123" are different passcodes.
--
-- Until now the column was bigint, so leading zeros were lost. This migration:
--   1. stops with a clear error if any OTHER database function or view still uses nicknames.passcode
--      (changing the column type would break it): review those first;
--   2. changes nicknames.passcode to text;
--   3. replaces the three login functions with text versions (the bigint versions are dropped);
--   4. keeps existing users signed in: a passcode that was saved before this change lost its leading zeros
--      (typed 012345, stored 12345), so a typed passcode also matches a stored one without its leading zeros.
--      After such a user signs in once, the typed form is saved and the shortcut is no longer needed for them.
--
-- Run it in the Supabase SQL editor, THEN deploy the two Edge Functions straight away
-- (supabase functions deploy set_nickname_passcode nickname-passcode-exchange).
-- Between the two steps the old Edge Functions keep working: they still send a number, which the text
-- parameter accepts.

begin;

do $$
declare
  others text;
begin
  select string_agg(p.proname, ', ') into others
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.prokind = 'f'
    and p.proname not in ('verify_nickname_passcode', 'set_nickname_passcode', 'upsert_or_verify_profile')
    and pg_get_functiondef(p.oid) ilike '%passcode%';
  if others is not null then
    raise exception 'Stopped: these functions also use "passcode" and must be checked first: %', others;
  end if;

  select string_agg(v.viewname, ', ') into others
  from pg_views v
  where v.schemaname = 'public' and v.definition ilike '%passcode%';
  if others is not null then
    raise exception 'Stopped: these views use "passcode" and must be checked first: %', others;
  end if;
end $$;

alter table public.nicknames alter column passcode type text using passcode::text;

drop function if exists public.verify_nickname_passcode(text, bigint);
drop function if exists public.set_nickname_passcode(text, bigint);
drop function if exists public.upsert_or_verify_profile(text, text, bigint, text);

create function public.verify_nickname_passcode(nickname text, passcode text)
returns table(user_unique_key text)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select n.user_unique_key
  from public.nicknames n
  where canon(n.name) = canon(verify_nickname_passcode.nickname)
    and n.passcode is not null
    and (
      n.passcode = verify_nickname_passcode.passcode
      -- saved before this change: leading zeros were lost
      or n.passcode = ltrim(verify_nickname_passcode.passcode, '0')
    )
  limit 1;
$function$;

-- Kept only to document the database: it changes nothing and nothing in the app calls it.
create function public.set_nickname_passcode(nickname text, passcode text)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select;
$function$;

create function public.upsert_or_verify_profile(
    p_user_unique_key text,
    p_nickname text,
    p_passcode text,
    p_timezone text default null
)
returns table(user_unique_key text, nickname text, timezone text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_passcode text;
begin
  select n.passcode into v_passcode
  from public.nicknames n
  where n.user_unique_key = p_user_unique_key
  for update;

  if found then
    if v_passcode is not null
       and v_passcode <> p_passcode
       and v_passcode <> ltrim(p_passcode, '0') then
      raise exception 'nickname_already_exists';
    end if;
    return query
      update public.nicknames n
         -- a profile without a passcode gets this one; a passcode saved without its zeros is upgraded to the typed form
         set passcode = case
                          when n.passcode is null or n.passcode = ltrim(p_passcode, '0') then p_passcode
                          else n.passcode
                        end,
             timezone = coalesce(p_timezone, n.timezone)
       where n.user_unique_key = p_user_unique_key
      returning n.user_unique_key, n.name, n.timezone;
    return;
  end if;

  return query
    insert into public.nicknames as n (user_unique_key, name, passcode, timezone)
    values (p_user_unique_key, p_nickname, p_passcode, p_timezone)
    returning n.user_unique_key, n.name, n.timezone;
end;
$function$;

revoke execute on function public.upsert_or_verify_profile(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.set_nickname_passcode(text, text) from public, anon, authenticated;
revoke execute on function public.verify_nickname_passcode(text, text) from public, anon, authenticated;
grant execute on function public.upsert_or_verify_profile(text, text, text, text) to service_role;
grant execute on function public.set_nickname_passcode(text, text) to service_role;
grant execute on function public.verify_nickname_passcode(text, text) to service_role;

commit;
