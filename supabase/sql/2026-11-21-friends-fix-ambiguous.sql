-- 2026-11-21  Fix ambiguous OUT-parameter / column names in friends RPCs
-- Project: vijvcojvemkzgpzpowzh
--
-- add_friend_by_nickname failed live with 42702
-- "column reference friend_key is ambiguous" because RETURNS TABLE
-- (friend_key, nickname, created_at) collides with user_friends columns
-- in INSERT ... RETURNING.
--
-- Return shapes are unchanged, matching the client in src/lib/progress:
--   add_friend_by_nickname / list_friends: friend_key, nickname, created_at
--   remove_friend: removed, friend_key
--   get_friends_leaderboard: user_key, nickname, rank, learned_words,
--     learning_words, due_words, is_current_user
-- Error codes are unchanged: 22023, P0001, P0002, P0003, 28000.

create or replace function public.add_friend_by_nickname(p_nickname text)
returns table(friend_key text, nickname text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_user_key text := public.require_current_session_user_key();
  v_canon text;
  v_friend_key text;
  v_friend_name text;
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

  insert into public.user_friends as uf (user_key, friend_key)
  values (v_user_key, v_friend_key)
  on conflict (user_key, friend_key) do nothing;

  return query
  select uf.friend_key, n.name, uf.created_at
  from public.user_friends uf
  join public.nicknames n on n.user_unique_key = uf.friend_key
  where uf.user_key = v_user_key
    and uf.friend_key = v_friend_key;
end;
$$;

create or replace function public.remove_friend(p_nickname text)
returns table(removed boolean, friend_key text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
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

  return query select (v_deleted > 0), v_friend_key;
end;
$$;

create or replace function public.list_friends()
returns table(friend_key text, nickname text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
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
#variable_conflict use_column
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
    ))::integer,
    s.learned_words,
    s.learning_words,
    s.due_words,
    (s.uk = v_user_key)
  from stats s
  join public.nicknames n on n.user_unique_key = s.uk
  order by 3, n.name;
end;
$$;

comment on function public.add_friend_by_nickname(text) is
  'Session-gated. Add a user by exact nickname (case-insensitive, spaces ignored). Max 50 friends; 20 adds / 15 min.';
comment on function public.remove_friend(text) is
  'Session-gated. Remove a previously added nickname. Idempotent: removed=false if not a friend.';
comment on function public.list_friends() is
  'Session-gated. Nicknames the current user added, newest first.';
comment on function public.get_friends_leaderboard(text) is
  'Session-gated. Leaderboard of the current user plus people they added. p_period: today | week | allTime.';

notify pgrst, 'reload schema';
