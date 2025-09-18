set search_path = public;

-- Verify nickname + passcode
create or replace function public.verify_nickname_passcode(
    nickname text,
    passcode int8
)
returns table(user_unique_key text)
language sql
security definer
as $$
  select n.user_unique_key
  from public.nicknames n
  where lower(replace(n.name,' ','')) = lower(replace(nickname,' ',''))
    and n.passcode = passcode;
$$;

-- Set passcode for nickname
create or replace function public.set_nickname_passcode(
    nickname text,
    passcode int8
)
returns table(user_unique_key text)
language sql
security definer
as $$
  update public.nicknames
  set passcode = set_nickname_passcode.passcode
  where lower(replace(name,' ','')) = lower(replace(nickname,' ',''))
  returning user_unique_key;
$$;

grant execute on function public.verify_nickname_passcode(text, int8) to anon, authenticated;
grant execute on function public.set_nickname_passcode(text, int8) to anon, authenticated;
