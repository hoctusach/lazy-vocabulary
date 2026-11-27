-- 2026-11-27  Admin profile: edit official word data + browse every user's imported sets (FB-55)
--
-- ============================================================================
-- STATUS: **NOT APPLIED**. Do not run against the live project without the owner.
-- Until it is applied the client treats every admin RPC failure as "not admin":
-- no admin controls, normal users unchanged.
-- ============================================================================
--
-- What it creates / changes (additive, idempotent):
--   1. public.app_admins (user_key text PK -> nicknames.user_unique_key). RLS enabled + forced,
--      all table privileges revoked from public/anon/authenticated (no policies = no direct access).
--      The only way to become admin is the owner statement at the bottom (run by the owner in the SQL editor).
--   2. public.is_current_user_admin()  - helper, session based (require_current_session_user_key()).
--   3. public.admin_whoami()           - returns true/false for the current session; never raises for non-admins.
--   4. default_vocabulary_base: adds audit columns updated_by text, updated_at timestamptz.
--   5. public.admin_word_edits         - history (word, category, patch jsonb, actor, at); RLS forced, no direct grants.
--   6. public.admin_update_official_word(p_word, p_category, p_new_word, p_meaning, p_example, p_translation, p_new_category)
--                                      - SECURITY DEFINER, rejects non-admins, updates the official row in place, writes audit + history.
--   7. public.user_imported_sets (id uuid PK, owner_key, name, sheets jsonb, word_count, created_at, updated_at)
--      with RLS: a user can select/insert/update/delete only their own rows (policies use the session helper).
--   8. public.sync_imported_set(p_client_id, p_name, p_sheets) / public.delete_imported_set(p_client_id)
--                                      - owner-only upsert/delete used by the client's best-effort sync.
--   9. public.admin_list_imported_sets() / public.admin_get_imported_set(p_id)
--                                      - SECURITY DEFINER, admin only: other users' sets (owner nickname, name, word count / sheets).
--
-- Prerequisite: 2026-11-21-friends.sql section 0 (user_sessions + require_current_session_user_key()).
-- The admin flag is NEVER read from the client: every RPC checks app_admins with the session user.

set search_path = public;

-- 1. admins -------------------------------------------------------------------
create table if not exists public.app_admins (
  user_key   text primary key references public.nicknames(user_unique_key) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
alter table public.app_admins force row level security;
revoke all on table public.app_admins from public, anon, authenticated;

-- 2. helpers ------------------------------------------------------------------
create or replace function public.is_current_user_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := public.require_current_session_user_key();
begin
  return exists (select 1 from public.app_admins a where a.user_key = v_key);
end;
$$;

create or replace function public.admin_whoami()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return public.is_current_user_admin();
end;
$$;

-- 4. audit columns on the official table -------------------------------------
alter table public.default_vocabulary_base add column if not exists updated_by text;
alter table public.default_vocabulary_base add column if not exists updated_at timestamptz;

-- 5. history -----------------------------------------------------------------
create table if not exists public.admin_word_edits (
  id        bigint generated always as identity primary key,
  word      text not null,
  category  text,
  patch     jsonb not null,
  actor     text not null,
  at        timestamptz not null default now()
);
alter table public.admin_word_edits enable row level security;
alter table public.admin_word_edits force row level security;
revoke all on table public.admin_word_edits from public, anon, authenticated;

-- 6. official word edit ------------------------------------------------------
create or replace function public.admin_update_official_word(
  p_word text,
  p_category text,
  p_new_word text,
  p_meaning text,
  p_example text,
  p_translation text,
  p_new_category text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := public.require_current_session_user_key();
  v_new_word text := btrim(coalesce(p_new_word, p_word));
  v_old record;
  v_cats text[] := array['topic vocab','phrasal verbs','idioms','grammar','phrases, collocations','word formation'];
  v_new_cat text := coalesce(nullif(btrim(p_new_category), ''), p_category);
begin
  if not public.is_current_user_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_new_word = '' or btrim(coalesce(p_meaning, '')) = '' then
    raise exception 'word and meaning are required' using errcode = '22023';
  end if;
  if not (v_new_cat = any (v_cats)) then
    raise exception 'invalid category' using errcode = '22023';
  end if;
  select * into v_old from public.default_vocabulary_base where word = p_word and category = p_category;
  if not found then
    raise exception 'word not found' using errcode = 'P0002';
  end if;
  if v_new_word <> p_word and exists (select 1 from public.learned_words lw where lw.word_id = p_word or starts_with(lw.word_id, p_word || '::')) then
    raise exception 'the word text cannot change while learners have progress on it' using errcode = '22023';
  end if;
  update public.default_vocabulary_base
     set word = v_new_word,
         category = v_new_cat,
         meaning = btrim(p_meaning),
         example = btrim(coalesce(p_example, '')),
         translation = nullif(btrim(coalesce(p_translation, '')), ''),
         updated_by = v_key,
         updated_at = now()
   where word = p_word and category = p_category;
  insert into public.admin_word_edits (word, category, patch, actor)
  values (p_word, p_category,
          jsonb_build_object('old', to_jsonb(v_old),
                             'new', jsonb_build_object('word', v_new_word, 'category', v_new_cat, 'meaning', btrim(p_meaning),
                                                        'example', btrim(coalesce(p_example, '')), 'translation', p_translation)),
          v_key);
end;
$$;

-- 7. imported sets store ------------------------------------------------------
create table if not exists public.user_imported_sets (
  id         uuid primary key default gen_random_uuid(),
  owner_key  text not null references public.nicknames(user_unique_key) on delete cascade,
  client_id  text not null,
  name       text not null,
  sheets     jsonb not null,
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_key, client_id),
  constraint user_imported_sets_name_len check (char_length(name) between 1 and 120)
);
alter table public.user_imported_sets enable row level security;
alter table public.user_imported_sets force row level security;
revoke all on table public.user_imported_sets from public, anon, authenticated;

drop policy if exists user_imported_sets_owner_all on public.user_imported_sets;
create policy user_imported_sets_owner_all on public.user_imported_sets
  for all
  using (owner_key = public.current_session_user_key())
  with check (owner_key = public.current_session_user_key());

-- 8. owner sync RPCs ---------------------------------------------------------
create or replace function public.sync_imported_set(p_client_id text, p_name text, p_sheets jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := public.require_current_session_user_key();
  v_count integer := 0;
  v_sheet record;
begin
  if p_client_id is null or char_length(p_client_id) not between 1 and 200 then
    raise exception 'invalid id' using errcode = '22023';
  end if;
  if jsonb_typeof(p_sheets) <> 'object' or octet_length(p_sheets::text) > 2000000 then
    raise exception 'invalid sheets' using errcode = '22023';
  end if;
  for v_sheet in select value from jsonb_each(p_sheets) loop
    if jsonb_typeof(v_sheet.value) = 'array' then v_count := v_count + jsonb_array_length(v_sheet.value); end if;
  end loop;
  insert into public.user_imported_sets (owner_key, client_id, name, sheets, word_count)
  values (v_key, p_client_id, left(btrim(p_name), 120), p_sheets, v_count)
  on conflict (owner_key, client_id)
  do update set name = excluded.name, sheets = excluded.sheets, word_count = excluded.word_count, updated_at = now();
end;
$$;

create or replace function public.delete_imported_set(p_client_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := public.require_current_session_user_key();
begin
  delete from public.user_imported_sets where owner_key = v_key and client_id = p_client_id;
end;
$$;

-- 9. admin browsing -----------------------------------------------------------
create or replace function public.admin_list_imported_sets()
returns table(id uuid, owner_nickname text, name text, word_count integer, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select s.id, n.nickname, s.name, s.word_count, s.updated_at
    from public.user_imported_sets s
    left join public.nicknames n on n.user_unique_key = s.owner_key
    order by s.updated_at desc
    limit 500;
end;
$$;

create or replace function public.admin_get_imported_set(p_id uuid)
returns table(id uuid, owner_nickname text, name text, sheets jsonb)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select s.id, n.nickname, s.name, s.sheets
    from public.user_imported_sets s
    left join public.nicknames n on n.user_unique_key = s.owner_key
    where s.id = p_id;
end;
$$;

-- grants: only signed-in clients may call the RPCs; every one re-checks the session (and admin) itself.
revoke all on function public.is_current_user_admin() from public, anon, authenticated;
revoke all on function public.admin_whoami() from public, anon;
revoke all on function public.admin_update_official_word(text,text,text,text,text,text,text) from public, anon;
revoke all on function public.sync_imported_set(text,text,jsonb) from public, anon;
revoke all on function public.delete_imported_set(text) from public, anon;
revoke all on function public.admin_list_imported_sets() from public, anon;
revoke all on function public.admin_get_imported_set(uuid) from public, anon;
grant execute on function public.admin_whoami() to authenticated;
grant execute on function public.admin_update_official_word(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.sync_imported_set(text,text,jsonb) to authenticated;
grant execute on function public.delete_imported_set(text) to authenticated;
grant execute on function public.admin_list_imported_sets() to authenticated;
grant execute on function public.admin_get_imported_set(uuid) to authenticated;

-- =============================================================================
-- MAKE THE OWNER AN ADMIN (run by the owner in the SQL editor, never from the client).
-- Look up the key first, e.g.:  select user_unique_key, nickname from public.nicknames where nickname = '<OWNER_NICKNAME>';
--
--   insert into public.app_admins (user_key) values ('<OWNER_USER_KEY>') on conflict do nothing;
--
-- Remove admin:  delete from public.app_admins where user_key = '<OWNER_USER_KEY>';
--
-- APPLY: run this file on a Supabase branch first, then call admin_whoami() with the owner's session.
-- ROLLBACK (manual):
--   drop function if exists public.admin_get_imported_set(uuid), public.admin_list_imported_sets(),
--     public.delete_imported_set(text), public.sync_imported_set(text,text,jsonb),
--     public.admin_update_official_word(text,text,text,text,text,text,text), public.admin_whoami(),
--     public.is_current_user_admin();
--   drop table if exists public.user_imported_sets, public.admin_word_edits, public.app_admins;
--   alter table public.default_vocabulary_base drop column if exists updated_by, drop column if exists updated_at;
-- =============================================================================
