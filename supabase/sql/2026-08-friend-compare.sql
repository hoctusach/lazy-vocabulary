set search_path = public;

-- Public, narrow read for the "compare with a friend" share link. Deliberately
-- NOT gated by require_session_user_key: anyone holding a ?friend=<key> link
-- can look up that one profile's nickname, learned-word count, and current
-- streak — nothing else. No word lists, no email, no passcode.
create or replace function public.get_public_progress_by_key(target_user_unique_key text)
returns table(nickname text, learned_count integer, streak_days integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nickname text;
  v_learned_count integer := 0;
  v_learned_days text[] := '{}';
  v_streak integer := 0;
  v_cursor date := (now() at time zone 'utc')::date;
begin
  if coalesce(btrim(target_user_unique_key), '') = '' then
    return;
  end if;

  select n.name into v_nickname
  from public.nicknames n
  where n.user_unique_key = target_user_unique_key;

  if v_nickname is null then
    -- Unknown key: nothing to compare.
    return;
  end if;

  select coalesce(ups.learned_count, 0), coalesce(ups.learned_days, '{}'::text[])
    into v_learned_count, v_learned_days
  from public.user_progress_summary ups
  where ups.user_unique_key = target_user_unique_key;

  while v_streak < 366 and (to_char(v_cursor, 'YYYY-MM-DD') = any(coalesce(v_learned_days, '{}'::text[]))) loop
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;

  return query select v_nickname, v_learned_count, v_streak;
end;
$$;

grant execute on function public.get_public_progress_by_key(text) to anon, authenticated;

notify pgrst, 'reload schema';
