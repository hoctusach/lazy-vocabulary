-- Fix: verify_nickname_passcode accepted ANY passcode for an existing nickname.
--
-- In a SQL-language function, an argument with the same name as a column loses to the
-- column. The old body compared "n.passcode = passcode", which Postgres read as
-- "n.passcode = n.passcode" (always true), so a wrong passcode still returned the user key.
-- The arguments are now qualified with the function name, and rows without a passcode never match.
--
-- Run once in the Supabase SQL editor. Existing grants are kept by CREATE OR REPLACE.
create or replace function public.verify_nickname_passcode(
    nickname text,
    passcode int8
)
returns table(user_unique_key text)
language sql
security definer
set search_path = public
as $$
  select n.user_unique_key
  from public.nicknames n
  where public.normalize_nickname(n.name) = public.normalize_nickname(verify_nickname_passcode.nickname)
    and n.passcode is not null
    and n.passcode = verify_nickname_passcode.passcode;
$$;
