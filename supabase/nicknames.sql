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

-- Helper accessors for request-scoped claims
create or replace function public.request_claim_text(claim_name text)
returns text
language sql
stable
as $$
  select nullif(
    (coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> claim_name),
    ''
  );
$$;

create or replace function public.request_claim_bigint(claim_name text)
returns bigint
language sql
stable
as $$
  select case
    when claim_txt ~ '^-?\\d+$' then claim_txt::bigint
    else null
  end
  from (
    select coalesce(public.request_claim_text(claim_name), '') as claim_txt
  ) s;
$$;

alter table public.nicknames enable row level security;

-- Drop legacy auth-based policies
drop policy if exists "nick_ins_upd_self" on public.nicknames;
drop policy if exists "nick_upd_self" on public.nicknames;
drop policy if exists "nick_select_self" on public.nicknames;

drop policy if exists "nicknames_manage_by_claims" on public.nicknames;

drop function if exists public.rotate_claim_code(text);
drop function if exists public.claim_nickname(text, text);

-- Passcode + user key based policies
create policy "nicknames_manage_by_claims"
on public.nicknames
for all
using (
  public.request_claim_text('user_unique_key') = user_unique_key
  and (
    (passcode is null and public.request_claim_bigint('passcode') is null)
    or (passcode is not null and public.request_claim_bigint('passcode') = passcode)
  )
)
with check (
  public.request_claim_text('user_unique_key') = user_unique_key
  and (
    (passcode is null and public.request_claim_bigint('passcode') is null)
    or (passcode is not null and public.request_claim_bigint('passcode') = passcode)
  )
);

notify pgrst, 'reload schema';
