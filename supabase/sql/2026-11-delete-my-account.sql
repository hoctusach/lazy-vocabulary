-- Account deletion for Lazy Vocabulary (required by Google Play's account-deletion policy).
--
-- HOW TO APPLY (not applied automatically — review first):
--   Supabase Dashboard → SQL Editor → paste this whole file → Run.
--   or:  psql "$SUPABASE_DB_URL" -f supabase/sql/2026-11-delete-my-account.sql
--   or:  supabase db push  (if you copy it into supabase/migrations/)
-- It is idempotent (create or replace). Test on a throwaway nickname first.
--
-- AUTH MODEL (why this is not auth.uid()-based):
--   The app does NOT use Supabase Auth. A user is a row in public.nicknames
--   (name + numeric passcode + user_unique_key = canonical nickname). The
--   "session" is a custom token in public.user_sessions, and the client does not
--   reliably attach it to PostgREST calls (see 2026-08-friend-compare.sql). So,
--   like get_or_create_share_token, this function re-proves nickname + passcode
--   inside the function. There is no auth.users row to delete.
--
-- WHAT IT DELETES for the matching user_unique_key:
--   * every public BASE TABLE that has a user_unique_key column (currently
--     learned_words, user_progress_summary, share_tokens, user_sessions, plus any
--     table added later) — found dynamically, so new user-linked tables are covered;
--   * finally the public.nicknames row itself (FKs are ON DELETE CASCADE as well).
--   Share links (?friend=<token>) stop working because share_tokens is removed.
--
-- NOTE: a 4–10 digit passcode is weak against guessing, and this is callable with the
-- anon key (same exposure as sign-in and get_or_create_share_token). Consider adding
-- rate limiting / hashing passcodes (passcodes are currently stored in plaintext in
-- public.nicknames.passcode).
set search_path = public;

create or replace function public.delete_my_account(
  p_nickname text,
  p_passcode int8
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_key text;
  r record;
  v_deleted jsonb := '{}'::jsonb;
  v_count bigint;
begin
  select n.user_unique_key into v_user_key
  from public.nicknames n
  where public.normalize_nickname(n.name) = public.normalize_nickname(p_nickname)
    and n.passcode = p_passcode;

  if v_user_key is null then
    raise exception 'invalid nickname or passcode' using errcode = '28000';
  end if;

  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name = c.table_name
     and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.column_name = 'user_unique_key'
      and c.table_name <> 'nicknames'
  loop
    execute format('delete from public.%I where user_unique_key = $1', r.table_name)
      using v_user_key;
    get diagnostics v_count = row_count;
    v_deleted := v_deleted || jsonb_build_object(r.table_name, v_count);
  end loop;

  delete from public.nicknames where user_unique_key = v_user_key;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('nicknames', v_count);

  return jsonb_build_object('deleted', true, 'rows', v_deleted);
end;
$$;

revoke all on function public.delete_my_account(text, int8) from public;
grant execute on function public.delete_my_account(text, int8) to anon, authenticated;

notify pgrst, 'reload schema';
