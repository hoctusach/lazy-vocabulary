-- 2026-11-16  RLS / grant hardening for lazy-voca (project vijvcojvemkzgpzpowzh)
--
-- Context (investigated 2026-11-16):
--   * The app does NOT use Supabase Auth. Sign-in is nickname + passcode via the
--     edge functions `nickname-passcode-exchange` / `set_nickname_passcode`
--     (service_role). PostgREST calls from the app run as `anon`.
--   * user_unique_key = canon(nickname) (lower-case, no spaces) -> it is not a secret.
--   * App (web bundle deployed at www.lazyvoca.fun from main/docs AND the current
--     branch) touches the DB only via:
--       - SELECT learned_words(user_unique_key, srs_state, in_review_queue, next_review_at)  [leaderboard]
--       - SELECT user_progress_summary(learning_count, learned_count, learning_due_count,
--                remaining_count, learning_time, learned_days, updated_at) WHERE user_unique_key=?
--       - SELECT nicknames(timezone) WHERE user_unique_key=?
--       - RPC generate_daily_selection_v2, mark_word_learned_by_key, mark_word_new_by_key,
--             search_vocabulary, fetch_vocabulary_by_ids  (+ two share-token RPCs that do not exist)
--   * All writes to learned_words / user_progress_summary happen inside SECURITY DEFINER
--     functions owned by postgres (BYPASSRLS), so they keep working with RLS on.
--
-- This migration is BACKWARD COMPATIBLE with the deployed web app and installed APKs:
--   it only removes privileges the app never uses.
--
-- What it does:
--   1. Snapshot policies / grants / function ACL+config / RLS flags into
--      public._security_backup_20261116 (RLS on, no grants -> not exposed).
--   2. learned_words + user_progress_summary: ENABLE RLS, drop old permissive
--      policies, revoke ALL direct privileges from anon/authenticated, re-grant
--      column-level SELECT only on the columns the app reads, plus a read-only policy.
--      Direct INSERT/UPDATE/DELETE/TRUNCATE by anon is no longer possible.
--   3. nicknames: revoke ALL, re-grant SELECT on every column EXCEPT passcode
--      (plain-text passcodes were readable by anyone with the public anon key).
--   4. Revoke EXECUTE from PUBLIC/anon/authenticated on server-only functions:
--      upsert_or_verify_profile (allowed anyone to overwrite any user's passcode),
--      set_nickname_passcode, verify_nickname_passcode (passcode brute force oracle),
--      refresh_user_progress_summary, ensure_progress_row, commit_daily_selection,
--      nicknames_set_key. service_role keeps EXECUTE (edge functions).
--   5. Pin search_path = public, pg_temp on every public function.
--   6. Vocabulary tables / view and the 2026-11-16 backup tables: revoke write
--      privileges from anon/authenticated; enable RLS on the backup tables.
--
-- STATUS: APPLIED LIVE 2026-11-16 ~20:55 (UTC+7) as migration rls_hardening_20261116.
-- Dry run (forced rollback) + live anon checks: see qa notes.
-- Rollback: see the ROLLBACK block at the end of this file.

begin;

-- 1. snapshot --------------------------------------------------------------
create table if not exists public._security_backup_20261116 (
  id bigserial primary key,
  taken_at timestamptz not null default now(),
  kind text not null,
  object text not null,
  detail jsonb not null
);
alter table public._security_backup_20261116 enable row level security;
revoke all on public._security_backup_20261116 from anon, authenticated;

insert into public._security_backup_20261116(kind, object, detail)
select 'policy', tablename, to_jsonb(p) from pg_policies p where schemaname = 'public';

insert into public._security_backup_20261116(kind, object, detail)
select 'table_grant', table_name,
       jsonb_build_object('grantee', grantee, 'privilege', privilege_type)
  from information_schema.role_table_grants
 where table_schema = 'public' and grantee in ('anon','authenticated','PUBLIC');

insert into public._security_backup_20261116(kind, object, detail)
select 'rls', c.relname, jsonb_build_object('rls', c.relrowsecurity, 'force', c.relforcerowsecurity)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind in ('r','v','m');

insert into public._security_backup_20261116(kind, object, detail)
select 'function', p.oid::regprocedure::text,
       jsonb_build_object('acl', p.proacl::text, 'config', p.proconfig, 'secdef', p.prosecdef)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public';

-- 2a. learned_words --------------------------------------------------------
alter table public.learned_words enable row level security;
drop policy if exists "Enable read access for all users"          on public.learned_words;
drop policy if exists "Enable insert for authenticated users only" on public.learned_words;
drop policy if exists "Allow select by user_unique_key"            on public.learned_words;
revoke all on public.learned_words from anon, authenticated;
grant select (user_unique_key, srs_state, in_review_queue, next_review_at)
  on public.learned_words to anon, authenticated;
create policy learned_words_leaderboard_read on public.learned_words
  for select to anon, authenticated using (true);

-- 2b. user_progress_summary -----------------------------------------------
alter table public.user_progress_summary enable row level security;
revoke all on public.user_progress_summary from anon, authenticated;
grant select (user_unique_key, learning_count, learned_count, learning_due_count,
              remaining_count, learning_time, learned_days, updated_at)
  on public.user_progress_summary to anon, authenticated;
create policy user_progress_summary_read on public.user_progress_summary
  for select to anon, authenticated using (true);

-- 3. nicknames: hide passcode ---------------------------------------------
revoke all on public.nicknames from anon, authenticated;
grant select (id, created_at, name, user_unique_key, timezone,
              days_learned, learning_words_count, last_learned_at)
  on public.nicknames to anon, authenticated;

-- 4. server-only functions --------------------------------------------------
revoke execute on function public.upsert_or_verify_profile(text, text, bigint, text) from public, anon, authenticated;
revoke execute on function public.set_nickname_passcode(text, bigint)               from public, anon, authenticated;
revoke execute on function public.verify_nickname_passcode(text, bigint)            from public, anon, authenticated;
revoke execute on function public.refresh_user_progress_summary(text)               from public, anon, authenticated;
revoke execute on function public.ensure_progress_row(text)                         from public, anon, authenticated;
revoke execute on function public.commit_daily_selection(text, text[])              from public, anon, authenticated;
revoke execute on function public.nicknames_set_key()                               from public, anon, authenticated;
grant execute on function public.upsert_or_verify_profile(text, text, bigint, text) to service_role;
grant execute on function public.set_nickname_passcode(text, bigint)               to service_role;
grant execute on function public.verify_nickname_passcode(text, bigint)            to service_role;
grant execute on function public.refresh_user_progress_summary(text)               to service_role;
grant execute on function public.ensure_progress_row(text)                         to service_role;
grant execute on function public.commit_daily_selection(text, text[])              to service_role;

-- 5. pin search_path --------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;
end $$;

-- 6. vocabulary + backup tables --------------------------------------------
revoke insert, update, delete, truncate, references, trigger
  on public.default_vocabulary_base, public."total _words", public.default_vocabulary
  from anon, authenticated;

do $$
declare r record;
begin
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relname like '%bak_2026%'
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    execute format('revoke all on public.%I from anon, authenticated', r.relname);
  end loop;
end $$;

commit;

-- ROLLBACK (manual; run only if something breaks) ---------------------------
-- begin;
--   alter table public.learned_words disable row level security;
--   alter table public.user_progress_summary disable row level security;
--   drop policy if exists learned_words_leaderboard_read on public.learned_words;
--   drop policy if exists user_progress_summary_read on public.user_progress_summary;
--   grant all on public.learned_words, public.user_progress_summary, public.nicknames,
--               public.default_vocabulary_base, public."total _words", public.default_vocabulary
--     to anon, authenticated;
--   create policy "Enable read access for all users" on public.learned_words for select using (true);
--   create policy "Allow select by user_unique_key"  on public.learned_words for select using (true);
--   create policy "Enable insert for authenticated users only" on public.learned_words
--     for insert to authenticated with check (true);
--   grant execute on function public.upsert_or_verify_profile(text, text, bigint, text),
--     public.set_nickname_passcode(text, bigint), public.verify_nickname_passcode(text, bigint),
--     public.refresh_user_progress_summary(text), public.ensure_progress_row(text),
--     public.commit_daily_selection(text, text[]), public.nicknames_set_key()
--     to public, anon, authenticated;
--   -- search_path pins are harmless; reset with: alter function <sig> reset search_path;
--   -- exact previous state is in public._security_backup_20261116
-- commit;
