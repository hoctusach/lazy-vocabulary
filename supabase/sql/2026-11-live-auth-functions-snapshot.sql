-- Snapshot of the login functions that are LIVE in Supabase (read on 2026-11-26 with pg_get_functiondef).
-- It replaces 2025-05-nickname-passcode.sql, which did not match the database (it defined normalize_nickname,
-- which does not exist there, and its verify function compared the passcode column with itself).
--
-- upsert_or_verify_profile is in 2026-11-fix-upsert-or-verify-profile.sql (the live version before that file
-- let anyone overwrite a passcode). Not in the repo yet and still to be snapshotted:
--   public.canon(text)  -- used below to compare nicknames
--   generate_daily_selection_v2, mark_word_learned_by_key, mark_word_new_by_key, fetch_vocabulary_by_ids,
--   search_vocabulary, get_or_create_share_token, get_public_progress_by_token
-- Get any of them with:
--   select pg_get_functiondef(oid) from pg_proc where pronamespace = 'public'::regnamespace and proname = '<name>';

CREATE OR REPLACE FUNCTION public.verify_nickname_passcode(nickname text, passcode bigint)
 RETURNS TABLE(user_unique_key text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select n.user_unique_key
  from public.nicknames n
  where canon(n.name) = canon(verify_nickname_passcode.nickname)
    and n.passcode::text = verify_nickname_passcode.passcode::text
  limit 1;
$function$;

-- Live definition. Note: inside this function "passcode" is the table column, so it assigns the column to
-- itself and changes nothing. Nothing in the app calls it; it is kept here only to document the database.
CREATE OR REPLACE FUNCTION public.set_nickname_passcode(nickname text, passcode bigint)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  update public.nicknames
  set passcode = passcode
  where user_unique_key = lower(replace(nickname,' ',''));
$function$;

-- TODO (database side of the nickname rule): the Edge Functions and the app now ignore invisible format
-- characters (zero-width space, BOM...) when they build the user key. canon() above should do the same,
-- otherwise a name typed with such a character finds the account but fails verify_nickname_passcode.
-- Check its definition first: select pg_get_functiondef('public.canon(text)'::regprocedure);
