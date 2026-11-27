-- Fix: creating a profile with an existing nickname took over that account.
--
-- upsert_or_verify_profile (called by the set_nickname_passcode and nickname-passcode-exchange
-- Edge Functions) updated the existing row and set its passcode to the one supplied, without
-- checking the old passcode. So "creating" a profile named like an existing user, with any new
-- passcode, replaced that user's passcode and signed in to their data.
--
-- New behaviour:
--   * new nickname                              -> create the profile
--   * existing nickname, same passcode          -> ok (acts as sign-in); timezone is refreshed
--   * existing nickname, different passcode     -> raises nickname_already_exists (the Edge Function
--                                                  turns this into HTTP 409 NICKNAME_TAKEN)
--   * existing profile that has no passcode yet -> the caller sets it (first claim)
-- The stored display name is never changed by a later call.
--
-- Run once in the Supabase SQL editor.
create or replace function public.upsert_or_verify_profile(
    p_user_unique_key text,
    p_nickname text,
    p_passcode bigint,
    p_timezone text default null
)
returns table(user_unique_key text, nickname text, timezone text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_passcode bigint;
begin
  select n.passcode into v_passcode
  from public.nicknames n
  where n.user_unique_key = p_user_unique_key
  for update;

  if found then
    if v_passcode is not null and v_passcode <> p_passcode then
      raise exception 'nickname_already_exists';
    end if;
    return query
      update public.nicknames n
         set passcode = coalesce(n.passcode, p_passcode),
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

-- Only the Edge Functions (service role) should call the auth functions. Without this, anyone
-- with the public anon key can call them over the REST API and bypass the Edge Functions.
-- The app itself never calls these three directly.
revoke execute on function public.upsert_or_verify_profile(text, text, bigint, text) from public, anon, authenticated;
revoke execute on function public.set_nickname_passcode(text, bigint) from public, anon, authenticated;
revoke execute on function public.verify_nickname_passcode(text, bigint) from public, anon, authenticated;
grant execute on function public.upsert_or_verify_profile(text, text, bigint, text) to service_role;
grant execute on function public.set_nickname_passcode(text, bigint) to service_role;
grant execute on function public.verify_nickname_passcode(text, bigint) to service_role;
