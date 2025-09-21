set search_path = public;

-- Helper to normalize nicknames consistently across lookups
create or replace function public.normalize_nickname(input text)
returns text
language sql
immutable
as $$
  select lower(replace(coalesce(input, ''), ' ', ''));
$$;

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
  where public.normalize_nickname(n.name) = public.normalize_nickname(nickname)
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
  where public.normalize_nickname(name) = public.normalize_nickname(nickname)
  returning user_unique_key;
$$;

-- Lookup a nickname using normalized comparison logic
create or replace function public.find_nickname_by_normalized(
    nickname text
)
returns table(user_unique_key text, name text)
language sql
security definer
as $$
  select n.user_unique_key, n.name
  from public.nicknames n
  where public.normalize_nickname(n.name) = public.normalize_nickname(nickname)
  limit 1;
$$;

grant execute on function public.verify_nickname_passcode(text, int8) to anon, authenticated;
grant execute on function public.set_nickname_passcode(text, int8) to anon, authenticated;
grant execute on function public.find_nickname_by_normalized(text) to anon, authenticated;
