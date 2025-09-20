create extension if not exists pgcrypto;

create table if not exists public.nicknames (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text not null,
  passcode int8,
  user_unique_key text not null
);

alter table public.nicknames drop column if exists user_id;
alter table public.nicknames drop column if exists claim_code_hash;
alter table public.nicknames drop column if exists claim_code;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nicknames'
      and column_name = 'display_name'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'nicknames'
        and column_name = 'name'
    ) then
      alter table public.nicknames rename column display_name to name;
    else
      alter table public.nicknames drop column display_name;
    end if;
  end if;
end
$$;

alter table public.nicknames drop column if exists name_canonical;

alter table public.nicknames
  add column if not exists created_at timestamptz not null default now();

alter table public.nicknames
  add column if not exists name text;

alter table public.nicknames
  add column if not exists passcode int8;

alter table public.nicknames
  add column if not exists user_unique_key text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nicknames'
      and column_name = 'user_unique_key'
      and generation_expression is not null
  ) then
    alter table public.nicknames drop constraint if exists nicknames_user_unique_key_key;
    alter table public.nicknames add column if not exists user_unique_key_tmp text;
    update public.nicknames
       set user_unique_key_tmp = lower(regexp_replace(name, '\\s+', '', 'g'));
    alter table public.nicknames drop column user_unique_key;
    alter table public.nicknames rename column user_unique_key_tmp to user_unique_key;
  end if;
end
$$;

alter table public.nicknames
  alter column user_unique_key set not null;

alter table public.nicknames
  alter column name set not null;

-- Maintain canonical uniqueness on nickname key
alter table public.nicknames drop constraint if exists nicknames_name_canonical_key;
alter table public.nicknames drop constraint if exists nicknames_user_unique_key_key;
alter table public.nicknames add constraint nicknames_user_unique_key_key unique (user_unique_key);

alter table public.nicknames enable row level security;

-- Drop legacy auth-based policies
drop policy if exists "nick_ins_upd_self" on public.nicknames;
drop policy if exists "nick_upd_self" on public.nicknames;
drop policy if exists "nick_select_self" on public.nicknames;

drop policy if exists "nicknames_manage_by_claims" on public.nicknames;

drop function if exists public.rotate_claim_code(text);
drop function if exists public.claim_nickname(text, text);
drop function if exists public.request_claim_text(text);
drop function if exists public.request_claim_bigint(text);

create or replace function public.current_session_token()
returns text
language plpgsql
stable
as $$
declare
  auth_header text;
begin
  auth_header := nullif(current_setting('request.header.authorization', true), '');
  if auth_header is null then
    return null;
  end if;
  if auth_header ilike 'bearer %' then
    return nullif(btrim(substring(auth_header from 8)), '');
  end if;
  return nullif(btrim(auth_header), '');
end;
$$;

create or replace function public.current_session_user_key()
returns text
language plpgsql
stable
security definer
set search_path = public
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

create policy "nicknames_by_session_token"
on public.nicknames
for all
using (user_unique_key = public.current_session_user_key())
with check (user_unique_key = public.current_session_user_key());

notify pgrst, 'reload schema';
