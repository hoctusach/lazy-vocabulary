-- 2026-11-21  Friends (add-by-nickname) + friends-only leaderboard
-- Project: vijvcojvemkzgpzpowzh
--
-- APPLIED to live via apply_migration name=friends_2026_11_21
-- (supabase_migrations version 20261121050320) on 2026-11-21 12:03 Asia/Saigon
-- after user approval (card t54s350). This file is the SQL that was applied.
-- BEGIN/COMMIT were omitted because apply_migration already wraps the script
-- in a transaction.
--
-- This file is additive and idempotent (CREATE TABLE IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS, CREATE OR REPLACE FUNCTION, REVOKE/GRANT).
-- No policies are created on user_sessions or user_friends, so there is
-- nothing to DROP POLICY IF EXISTS. It does not tighten or drop
-- learned_words_leaderboard_read / user_progress_summary_read, because
-- already-shipped APKs still SELECT those tables for the global top-5
-- board. Tighten those policies only after the new app is the only client.
--
-- Context (investigated 2026-11-21, live catalog, read-only, immediately
-- before apply):
--   * public.share_tokens, public.user_sessions, and the share-token /
--     session helper RPCs did not exist. supabase/sql/2026-08-friend-compare.sql
--     and supabase/sql/2025-06-user-sessions.sql were never applied
--     (supabase_migrations only listed rls_hardening_20261116).
--   * user_sessions was confirmed missing (list_tables, describe_tables,
--     and pg_class). The CREATE TABLE below was therefore used as written;
--     no column adaptation was needed. Earlier notes that login already
--     upserts into user_sessions referred to edge-function code, not a
--     live table.
--   * "Compare with a friend" therefore always fails: the app calls
--     get_or_create_share_token, PostgREST returns 404, the client swallows
--     the error and toasts "Sign in first…".
--   * The app does not use Supabase Auth. Sign-in is nickname + passcode via
--     edge function nickname-passcode-exchange, which already upserts into
--     public.user_sessions — a table that is missing, so that upsert cannot
--     succeed until the prerequisite section below is applied.
--   * Progress RPCs (generate_daily_selection_v2, mark_word_*_by_key) take
--     p_user_key and do not check a session (known issue, not fixed here).
--
-- Session transport:
--   Existing unapplied helpers read the session from Authorization. That
--   cannot work with PostgREST: Authorization must stay the anon JWT so
--   the request runs as role `anon`. These helpers therefore read the
--   custom session from `X-Session-Token` and look it up in user_sessions,
--   which is the same proof (a live, unexpired session_token) — only the
--   header name is different. The client must attach that header; see
--   /workspace/design/friends-plan.md.
--
-- Nickname matching uses public.canon() (live, indexed as idx_nicknames_canon),
-- which lowercases and strips whitespace.

set search_path = public;


-- =============================================================================
-- 0. Prerequisite: user_sessions + session helpers
--    (from 2025-06-user-sessions.sql, never applied; header name corrected)
-- =============================================================================

create table if not exists public.user_sessions (
  session_token text primary key,
  user_unique_key text not null references public.nicknames(user_unique_key) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists user_sessions_user_key_idx
  on public.user_sessions (user_unique_key);

create index if not exists user_sessions_expires_at_idx
  on public.user_sessions (expires_at);

alter table public.user_sessions enable row level security;
alter table public.user_sessions force row level security;

revoke all on table public.user_sessions from public, anon, authenticated;

-- No anon/authenticated policies: only service_role (edge function) and
-- SECURITY DEFINER helpers (owner postgres, BYPASSRLS) touch this table.

create or replace function public.current_session_token()
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  token text;
  auth_header text;
begin
  -- Preferred: custom header, so Authorization can remain the anon JWT.
  token := nullif(btrim(current_setting('request.header.x-session-token', true)), '');
  if token is not null then
    return token;
  end if;

  -- Fallback for a client that put a non-JWT session in Authorization.
  auth_header := nullif(current_setting('request.header.authorization', true), '');
  if auth_header is null then
    return null;
  end if;
  if auth_header ilike 'bearer %' then
    token := nullif(btrim(substring(auth_header from 8)), '');
  else
    token := nullif(btrim(auth_header), '');
  end if;
  -- Ignore JWTs (anon/service keys and access tokens): those are not
  -- rows in user_sessions.
  if token is not null and token like '%.%.%' then
    return null;
  end if;
  return token;
end;
$$;

create or replace function public.current_session_user_key()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  token text := public.current_session_token();
  result text;
begin
  if token is null then
    return null;
  end if;

  select us.user_unique_key
    into result
  from public.user_sessions us
  where us.session_token = token
    and us.expires_at > now()
  limit 1;

  return result;
end;
$$;

create or replace function public.require_current_session_user_key()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  actual text := public.current_session_user_key();
begin
  if actual is null or btrim(actual) = '' then
    raise exception 'invalid session' using errcode = '28000';
  end if;
  return actual;
end;
$$;

revoke all on function public.current_session_token() from public, anon, authenticated;
revoke all on function public.current_session_user_key() from public, anon, authenticated;
revoke all on function public.require_current_session_user_key() from public, anon, authenticated;
grant execute on function public.current_session_token() to postgres, service_role;
grant execute on function public.current_session_user_key() to postgres, service_role;
grant execute on function public.require_current_session_user_key() to postgres, service_role;

-- =============================================================================
-- 1. user_friends — one-way "I added this nickname"
-- =============================================================================

create table if not exists public.user_friends (
  user_key text not null references public.nicknames(user_unique_key) on delete cascade,
  friend_key text not null references public.nicknames(user_unique_key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_key, friend_key),
  constraint user_friends_no_self check (user_key <> friend_key)
);

create index if not exists user_friends_friend_key_idx
  on public.user_friends (friend_key);

create index if not exists user_friends_user_created_idx
  on public.user_friends (user_key, created_at desc);

comment on table public.user_friends is
  'One-way add: user_key added friend_key. The leaderboard for user_key is user_key plus these rows. Not mutual.';

alter table public.user_friends enable row level security;
alter table public.user_friends force row level security;

revoke all on table public.user_friends from public, anon, authenticated;

-- =============================================================================
-- 2. RPCs (SECURITY DEFINER, session-gated, no direct table grants)
-- =============================================================================

create or replace function public.add_friend_by_nickname(p_nickname text)
returns table(friend_key text, nickname text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_key text := public.require_current_session_user_key();
  v_canon text;
  v_friend_key text;
  v_friend_name text;
  v_created timestamptz;
  v_count integer;
  v_recent integer;
  c_max_friends constant integer := 50;
  c_rate_limit constant integer := 20;
  c_rate_window constant interval := interval '15 minutes';
begin
  v_canon := public.canon(p_nickname);
  if v_canon is null or v_canon = '' or char_length(v_canon) < 3 or char_length(btrim(coalesce(p_nickname, ''))) > 40 then
    raise exception 'invalid nickname' using errcode = '22023';
  end if;

  select n.user_unique_key, n.name
    into v_friend_key, v_friend_name
  from public.nicknames n
  where n.user_unique_key = v_canon
     or public.canon(n.name) = v_canon
  order by case when n.user_unique_key = v_canon then 0 else 1 end
  limit 1;

  if v_friend_key is null then
    raise exception 'nickname not found' using errcode = 'P0002';
  end if;

  if v_friend_key = v_user_key then
    raise exception 'cannot add yourself' using errcode = 'P0001';
  end if;

  -- Serialize cap / rate-limit checks for this user.
  perform pg_advisory_xact_lock(hashtextextended('friends:' || v_user_key, 0));

  select count(*) into v_recent
  from public.user_friends uf
  where uf.user_key = v_user_key
    and uf.created_at > now() - c_rate_window;

  if v_recent >= c_rate_limit then
    raise exception 'too many friend requests, try later' using errcode = 'P0003';
  end if;

  select count(*) into v_count
  from public.user_friends uf
  where uf.user_key = v_user_key;

  if v_count >= c_max_friends then
    raise exception 'friend limit reached' using errcode = 'P0001';
  end if;

  insert into public.user_friends (user_key, friend_key)
  values (v_user_key, v_friend_key)
  on conflict (user_key, friend_key) do nothing
  returning public.user_friends.friend_key, v_friend_name, public.user_friends.created_at
    into v_friend_key, v_friend_name, v_created;

  if v_created is null then
    -- Already added: return the existing row (idempotent).
    select uf.friend_key, n.name, uf.created_at
      into v_friend_key, v_friend_name, v_created
    from public.user_friends uf
    join public.nicknames n on n.user_unique_key = uf.friend_key
    where uf.user_key = v_user_key
      and uf.friend_key = v_friend_key;
  end if;

  friend_key := v_friend_key;
  nickname := v_friend_name;
  created_at := v_created;
  return next;
end;
$$;

create or replace function public.remove_friend(p_nickname text)
returns table(removed boolean, friend_key text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_key text := public.require_current_session_user_key();
  v_canon text;
  v_friend_key text;
  v_deleted integer := 0;
begin
  v_canon := public.canon(p_nickname);
  if v_canon is null or v_canon = '' then
    raise exception 'invalid nickname' using errcode = '22023';
  end if;

  select n.user_unique_key
    into v_friend_key
  from public.nicknames n
  where n.user_unique_key = v_canon
     or public.canon(n.name) = v_canon
  order by case when n.user_unique_key = v_canon then 0 else 1 end
  limit 1;

  if v_friend_key is not null then
    delete from public.user_friends uf
    where uf.user_key = v_user_key
      and uf.friend_key = v_friend_key;
    get diagnostics v_deleted = row_count;
  end if;

  removed := v_deleted > 0;
  friend_key := v_friend_key;
  return next;
end;
$$;

create or replace function public.list_friends()
returns table(friend_key text, nickname text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_key text := public.require_current_session_user_key();
begin
  return query
  select uf.friend_key, n.name, uf.created_at
  from public.user_friends uf
  join public.nicknames n on n.user_unique_key = uf.friend_key
  where uf.user_key = v_user_key
  order by uf.created_at desc, n.name;
end;
$$;

create or replace function public.get_friends_leaderboard(p_period text default 'allTime')
returns table(
  user_key text,
  nickname text,
  rank integer,
  learned_words integer,
  learning_words integer,
  due_words integer,
  is_current_user boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_key text := public.require_current_session_user_key();
  v_period text := coalesce(nullif(btrim(p_period), ''), 'allTime');
  v_timezone text;
  v_today date;
  v_from_date date;
begin
  if v_period not in ('today', 'week', 'allTime') then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  select coalesce(n.timezone, 'Asia/Ho_Chi_Minh')
    into v_timezone
  from public.nicknames n
  where n.user_unique_key = v_user_key;

  v_timezone := coalesce(v_timezone, 'Asia/Ho_Chi_Minh');
  v_today := (now() at time zone v_timezone)::date;

  if v_period = 'today' then
    v_from_date := v_today;
  elsif v_period = 'week' then
    v_from_date := v_today - 6;
  else
    v_from_date := null;
  end if;

  return query
  with cohort as (
    select v_user_key as uk
    union
    select uf.friend_key
    from public.user_friends uf
    where uf.user_key = v_user_key
  ),
  stats as (
    select
      c.uk,
      count(*) filter (
        where lw.srs_state = 'learned'
          and (
            v_from_date is null
            or coalesce(lw.mark_learned_at, (lw.learned_at at time zone v_timezone)::date)
                 between v_from_date and v_today
          )
      )::integer as learned_words,
      count(*) filter (where lw.srs_state = 'learning')::integer as learning_words,
      count(*) filter (
        where lw.srs_state = 'learning'
          and lw.next_review_at is not null
          and lw.next_review_at <= now()
      )::integer as due_words
    from cohort c
    left join public.learned_words lw
      on lw.user_unique_key = c.uk
    group by c.uk
  )
  select
    s.uk,
    n.name,
    (rank() over (
      order by s.learned_words desc, s.learning_words desc, n.name
    ))::integer as rank,
    s.learned_words,
    s.learning_words,
    s.due_words,
    (s.uk = v_user_key) as is_current_user
  from stats s
  join public.nicknames n on n.user_unique_key = s.uk
  order by rank, n.name;
end;
$$;

comment on function public.add_friend_by_nickname(text) is
  'Session-gated. Add a user by exact nickname (case-insensitive, spaces ignored). Max 50 friends; 20 adds / 15 min.';
comment on function public.remove_friend(text) is
  'Session-gated. Remove a previously added friend by nickname. Idempotent.';
comment on function public.list_friends() is
  'Session-gated. Friends the current user has added (one-way).';
comment on function public.get_friends_leaderboard(text) is
  'Session-gated. Leaderboard of the current user plus people they added. p_period: today | week | allTime.';

revoke all on function public.add_friend_by_nickname(text) from public;
revoke all on function public.remove_friend(text) from public;
revoke all on function public.list_friends() from public;
revoke all on function public.get_friends_leaderboard(text) from public;

grant execute on function public.add_friend_by_nickname(text) to anon, authenticated, service_role;
grant execute on function public.remove_friend(text) to anon, authenticated, service_role;
grant execute on function public.list_friends() to anon, authenticated, service_role;
grant execute on function public.get_friends_leaderboard(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';

