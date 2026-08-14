set search_path = public;

-- Unguessable per-user share token for the "compare with a friend" link.
-- user_unique_key is NOT safe to use as this token: it's derived deterministically
-- from the nickname (see supabase/functions/set_nickname_passcode/index.ts's
-- canonNickname()), so anyone could guess a nickname and query another user's
-- progress directly. A random token, handed out only after re-proving the
-- nickname+passcode, closes that hole.
create table if not exists public.share_tokens (
  user_unique_key text primary key references public.nicknames(user_unique_key) on delete cascade,
  share_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

-- Re-verifies nickname+passcode (same check as verify_nickname_passcode) before
-- handing out — or lazily creating — that profile's share token. Deliberately
-- does not rely on require_session_user_key/current_session_user_key: the
-- custom session header those depend on is never actually attached by the
-- client (src/lib/supabaseClient.ts only forwards it when JWT-shaped, and the
-- real session token never is), so re-checking the passcode directly is the
-- reliable option here, consistent with how sign-in itself is verified.
create or replace function public.get_or_create_share_token(
  p_nickname text,
  p_passcode int8
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_key text;
  v_token text;
begin
  select n.user_unique_key into v_user_key
  from public.nicknames n
  where public.normalize_nickname(n.name) = public.normalize_nickname(p_nickname)
    and n.passcode = p_passcode;

  if v_user_key is null then
    raise exception 'invalid nickname or passcode' using errcode = '28000';
  end if;

  insert into public.share_tokens (user_unique_key)
  values (v_user_key)
  on conflict (user_unique_key) do nothing;

  select st.share_token into v_token
  from public.share_tokens st
  where st.user_unique_key = v_user_key;

  return v_token;
end;
$$;

grant execute on function public.get_or_create_share_token(text, int8) to anon, authenticated;

-- Public, narrow read for the "compare with a friend" share link. Looked up by
-- the random share_token above (never by user_unique_key) — anyone holding a
-- ?friend=<token> link can see that one profile's nickname, learned-word
-- count, and current streak. Nothing else: no word lists, no email, no
-- passcode, and no way to enumerate other users' tokens.
create or replace function public.get_public_progress_by_token(p_share_token text)
returns table(nickname text, learned_count integer, streak_days integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_key text;
  v_nickname text;
  v_learned_count integer := 0;
  v_learned_days text[] := '{}';
  v_streak integer := 0;
  v_cursor date := (now() at time zone 'utc')::date;
begin
  if coalesce(btrim(p_share_token), '') = '' then
    return;
  end if;

  select st.user_unique_key into v_user_key
  from public.share_tokens st
  where st.share_token = p_share_token;

  if v_user_key is null then
    -- Unknown or revoked token: nothing to compare.
    return;
  end if;

  select n.name into v_nickname
  from public.nicknames n
  where n.user_unique_key = v_user_key;

  if v_nickname is null then
    return;
  end if;

  select coalesce(ups.learned_count, 0), coalesce(ups.learned_days, '{}'::text[])
    into v_learned_count, v_learned_days
  from public.user_progress_summary ups
  where ups.user_unique_key = v_user_key;

  while v_streak < 366 and (to_char(v_cursor, 'YYYY-MM-DD') = any(coalesce(v_learned_days, '{}'::text[]))) loop
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return query select v_nickname, v_learned_count, v_streak;
end;
$$;

grant execute on function public.get_public_progress_by_token(text) to anon, authenticated;

notify pgrst, 'reload schema';
