-- 2026-11-21  Fix for friends_2026_11_21 — NOT APPLIED (needs user approval)
-- Project: vijvcojvemkzgpzpowzh
--
-- Found in a live E2E test on 2026-11-21 ~14:40 Asia/Saigon: every friends RPC
-- returns 28000 "invalid session", even with a fresh session token.
-- Two causes:
--   1. current_session_token() reads the legacy per-header GUC
--      request.header.x-session-token. PostgREST >= 12 (Supabase) only sets the
--      JSON GUC request.headers, so the token is always NULL.  -> fixed below.
--   2. The DEPLOYED edge function nickname-passcode-exchange (v8, 2025-09-22)
--      does not insert into public.user_sessions (table empty after sign-ins),
--      unlike the repo version supabase/functions/nickname-passcode-exchange.
--      -> needs a redeploy of the repo version (separate approval).
-- Both are needed for the friends feature to work.

create or replace function public.current_session_token()
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  headers json;
  token text;
  auth_header text;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    headers := null;
  end;
  if headers is null then
    return null;
  end if;

  token := nullif(btrim(headers ->> 'x-session-token'), '');
  if token is not null then
    return token;
  end if;

  -- Fallback for a client that put a non-JWT session in Authorization.
  auth_header := nullif(btrim(headers ->> 'authorization'), '');
  if auth_header is null then
    return null;
  end if;
  if auth_header ilike 'bearer %' then
    token := nullif(btrim(substring(auth_header from 8)), '');
  else
    token := auth_header;
  end if;
  if token is not null and token like '%.%.%' then
    return null; -- JWTs (anon/service keys) are not user_sessions rows
  end if;
  return token;
end;
$$;

revoke all on function public.current_session_token() from public, anon, authenticated;
grant execute on function public.current_session_token() to postgres, service_role;
