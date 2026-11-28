-- Optional passcode hint (FB-77) — NOT APPLIED (needs owner approval; project vijvcojvemkzgpzpowzh).
--
-- Adds a nullable hint to public.nicknames and two server-only functions. Idempotent: safe to run twice.
-- upsert_or_verify_profile and every login function are NOT touched (the live signature stays as is).
--
-- Deploy order:  1. this SQL   2. Edge Functions (passcode-hint, update-passcode-hint, set_nickname_passcode)
--                3. app release.   See PASSCODE_HINT_SETUP.md.
--
-- Privacy: the hint is shown to ANYONE who types the nickname (Forgot passcode? screen). The app and the Edge
-- Functions refuse a hint that contains the passcode. The column is NOT readable by anon/authenticated:
-- public.nicknames only grants SELECT on an explicit column list (2026-11-16-rls-hardening.sql), and this file
-- adds no grant. The only way out is get_passcode_hint(), which returns the hint and nothing else.
--
-- ROLLBACK (also idempotent):
--   drop function if exists public.set_passcode_hint(text, text);
--   drop function if exists public.get_passcode_hint(text);
--   alter table public.nicknames drop constraint if exists nicknames_passcode_hint_len;
--   alter table public.nicknames drop column if exists passcode_hint;
-- (Edge Functions keep working without it: they answer { hint: null } / skip saving.)

alter table public.nicknames add column if not exists passcode_hint text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'nicknames_passcode_hint_len' and conrelid = 'public.nicknames'::regclass
  ) then
    alter table public.nicknames
      add constraint nicknames_passcode_hint_len
      check (passcode_hint is null or char_length(passcode_hint) <= 60);
  end if;
end $$;

-- Make sure the client roles cannot read the column directly (no-op when never granted).
revoke all (passcode_hint) on public.nicknames from public, anon, authenticated;

-- Returns ONLY the hint. null = no hint OR unknown nickname (identical output).
create or replace function public.get_passcode_hint(p_nickname text)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select nullif(btrim(n.passcode_hint), '')
  from public.nicknames n
  where canon(n.name) = canon(p_nickname)
  limit 1;
$function$;

-- Sets or clears (null / empty) the hint of one user. Server-side only (Edge Functions, service_role).
create or replace function public.set_passcode_hint(p_user_unique_key text, p_hint text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_hint text := nullif(btrim(regexp_replace(coalesce(p_hint, ''), '[[:cntrl:]]+', ' ', 'g')), '');
begin
  if v_hint is not null and char_length(v_hint) > 60 then
    raise exception 'passcode_hint_too_long';
  end if;
  update public.nicknames n
     set passcode_hint = v_hint
   where n.user_unique_key = p_user_unique_key;
end;
$function$;

revoke execute on function public.get_passcode_hint(text)       from public, anon, authenticated;
revoke execute on function public.set_passcode_hint(text, text) from public, anon, authenticated;
grant  execute on function public.get_passcode_hint(text)       to service_role;
grant  execute on function public.set_passcode_hint(text, text) to service_role;

-- Check (read-only), run after applying:
--   select get_passcode_hint('some nickname without a hint') is null;     -- true, same as an unknown nickname
