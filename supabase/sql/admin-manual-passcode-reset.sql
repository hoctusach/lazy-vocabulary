-- ADMIN ONLY — manual passcode reset for ONE user. NOT APPLIED. Run it by hand in the Supabase SQL editor
-- (project vijvcojvemkzgpzpowzh) after you have checked who is asking.
--
-- !! NEVER paste a real passcode into chat, email or a ticket, and never commit this file with real values.
-- !! Edit the three values in the DO block, run, then put the placeholders back before saving the file.
--
-- For that user (matched with canon(name), like the app) it:
--   * sets the new passcode (must match ^\d{4,10}$; stored as text exactly as typed, leading zeros kept)
--   * deletes the user's user_sessions rows (signed out everywhere)
--   * optionally sets or clears the passcode hint (needs 2026-11-28-passcode-hint.sql applied)
--   * keeps user_unique_key unchanged, so all progress is kept
-- Anything wrong (nickname not found / matches several rows / passcode not 4-10 digits / hint too long or
-- containing the passcode) raises an error and nothing is changed. The final SELECT never shows the passcode.

do $reset$
declare
  v_nickname     text := 'REPLACE_WITH_NICKNAME';
  v_new_passcode text := 'REPLACE_WITH_NEW_PASSCODE';
  -- 'keep' = leave the hint as is, '' = clear it, anything else (max 60 chars) = set it.
  v_new_hint     text := 'keep';

  v_matches int;
  v_key     text;
begin
  if v_new_passcode !~ '^\d{4,10}$' then
    raise exception 'new passcode must be 4-10 digits';
  end if;

  select count(*), min(n.user_unique_key) into v_matches, v_key
  from public.nicknames n
  where canon(n.name) = canon(v_nickname);
  if v_matches <> 1 then
    raise exception 'expected exactly one nickname match, found %', v_matches;
  end if;

  if v_new_hint <> 'keep' and v_new_hint <> '' then
    if char_length(v_new_hint) > 60 then
      raise exception 'hint is longer than 60 characters';
    end if;
    if replace(replace(lower(v_new_hint), ' ', ''), '-', '') like '%' || v_new_passcode || '%' then
      raise exception 'hint must not contain the passcode';
    end if;
  end if;

  update public.nicknames set passcode = v_new_passcode where user_unique_key = v_key;

  if v_new_hint <> 'keep' then
    -- dynamic SQL so this script still parses (and the passcode reset still works) before the hint column exists
    execute 'update public.nicknames set passcode_hint = nullif($1, '''') where user_unique_key = $2'
      using v_new_hint, v_key;
  end if;

  delete from public.user_sessions where user_unique_key = v_key;
end
$reset$;

-- Verification (never prints the passcode): expect one row, passcode_format_ok = true, sessions_left = 0.
select n.name,
       n.user_unique_key,
       (n.passcode ~ '^\d{4,10}$') as passcode_format_ok,
       (select count(*) from public.user_sessions us where us.user_unique_key = n.user_unique_key) as sessions_left
from public.nicknames n
where canon(n.name) = canon('REPLACE_WITH_NICKNAME');
