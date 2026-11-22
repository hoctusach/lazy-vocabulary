-- 2026-11-22  Per-user translation overrides (Pro "Edit translation", FB-33)
--
-- ============================================================================
-- STATUS: APPLIED 2026-11-22 to the live project (migration name
-- user_translation_overrides_2026_11_22). DO NOT RE-RUN. Kept for reference.
-- The client syncs through list/set/clear RPCs (src/lib/translations/
-- translationOverridesSync.ts) and keeps working from local storage if any
-- call fails, so a missing table is never fatal.
-- ============================================================================
--
-- What applying it did (additive, idempotent):
--   * creates public.user_translation_overrides (user_key, word_id) -> translation
--     (one row per user per word; the shared vocabulary tables are NOT touched);
--   * enables + forces RLS and revokes all direct table access from
--     public/anon/authenticated (no policies = no direct reads/writes);
--   * adds three SECURITY DEFINER RPCs gated by the existing session helper
--     public.require_current_session_user_key() (applied with 2026-11-21-friends.sql,
--     reads the X-Session-Token header): list / set (empty text deletes) / clear.
--     A user can only ever read or write their own rows.
--
-- word_id is the client's stable identity: '<source>::<category>::<word>', lowercased,
-- where <source> is 'default' for built-in groups or the imported set id.
--
-- Prerequisite: 2026-11-21-friends.sql section 0 (user_sessions + session helpers).
--
-- Client follow-up (done): push on save/clear, pull on sign-in/start/online,
-- merge with last-write-wins on updated_at.

set search_path = public;

create table if not exists public.user_translation_overrides (
  user_key    text        not null,
  word_id     text        not null,
  translation text        not null,
  updated_at  timestamptz not null default now(),
  primary key (user_key, word_id),
  constraint user_translation_overrides_len check (
    char_length(word_id) between 1 and 400 and char_length(translation) between 1 and 4000
  )
);

alter table public.user_translation_overrides enable row level security;
alter table public.user_translation_overrides force row level security;

revoke all on table public.user_translation_overrides from public, anon, authenticated;

create or replace function public.list_translation_overrides()
returns table(word_id text, translation text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_key text := public.require_current_session_user_key();
begin
  return query
    select o.word_id, o.translation, o.updated_at
    from public.user_translation_overrides o
    where o.user_key = v_user_key
    order by o.updated_at desc
    limit 5000;
end;
$$;

-- Empty / whitespace-only text deletes the override (back to the shared translation).
create or replace function public.set_translation_override(p_word_id text, p_translation text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_key text := public.require_current_session_user_key();
  v_text text := btrim(replace(coalesce(p_translation, ''), E'\r', ''));
begin
  if p_word_id is null or char_length(p_word_id) not between 1 and 400 then
    raise exception 'invalid word id' using errcode = '22023';
  end if;
  if v_text = '' then
    delete from public.user_translation_overrides where user_key = v_user_key and word_id = p_word_id;
    return;
  end if;
  if char_length(v_text) > 4000 then
    raise exception 'translation too long' using errcode = '22023';
  end if;
  insert into public.user_translation_overrides (user_key, word_id, translation, updated_at)
  values (v_user_key, p_word_id, v_text, now())
  on conflict (user_key, word_id)
  do update set translation = excluded.translation, updated_at = now();
end;
$$;

create or replace function public.clear_translation_override(p_word_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_key text := public.require_current_session_user_key();
begin
  delete from public.user_translation_overrides where user_key = v_user_key and word_id = p_word_id;
end;
$$;

revoke all on function public.list_translation_overrides() from public, anon, authenticated;
revoke all on function public.set_translation_override(text, text) from public, anon, authenticated;
revoke all on function public.clear_translation_override(text) from public, anon, authenticated;
-- Same exposure as the friends RPCs: callable with the anon key, authorised by the session header inside.
grant execute on function public.list_translation_overrides() to anon, authenticated, service_role;
grant execute on function public.set_translation_override(text, text) to anon, authenticated, service_role;
grant execute on function public.clear_translation_override(text) to anon, authenticated, service_role;
