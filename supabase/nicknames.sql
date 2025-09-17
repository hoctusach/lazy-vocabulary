-- 1) Columns: name + generated user key (unique)
create extension if not exists pgcrypto;

-- Ensure table exists (keep your existing id pk)
create table if not exists public.nicknames (
  id bigserial primary key,
  user_id uuid unique,
  name text not null,
  user_unique_key text generated always as (
    lower(regexp_replace(name, '\\s+', '', 'g'))
  ) stored,
  passcode int8,
  claim_code_hash text,
  created_at timestamptz not null default now()
);

-- Migrate legacy columns to the new shape
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nicknames'
      and column_name = 'display_name'
  ) then
    alter table public.nicknames rename column display_name to name;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nicknames'
      and column_name = 'name_canonical'
  ) then
    alter table public.nicknames drop column name_canonical;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nicknames'
      and column_name = 'user_unique_key'
      and generation_expression is null
  ) then
    alter table public.nicknames drop column user_unique_key;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nicknames'
      and column_name = 'user_unique_key'
  ) then
    execute $$
      alter table public.nicknames
      add column user_unique_key text generated always as (
        lower(regexp_replace(name, '\\s+', '', 'g'))
      ) stored
    $$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nicknames'
      and column_name = 'passcode'
  ) then
    alter table public.nicknames add column passcode int8;
  end if;
end
$$;

-- Uniqueness on user_unique_key
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'nicknames_name_canonical_key'
  ) then
    alter table public.nicknames drop constraint nicknames_name_canonical_key;
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nicknames_user_unique_key_key'
  ) then
    alter table public.nicknames add constraint nicknames_user_unique_key_key unique (user_unique_key);
  end if;
end
$$;

alter table public.nicknames enable row level security;

-- Tight RLS (auth users can touch their row)
drop policy if exists "nick_ins_upd_self" on public.nicknames;
drop policy if exists "nick_upd_self"     on public.nicknames;
drop policy if exists "nick_select_self"  on public.nicknames;

create policy "nick_ins_upd_self"
on public.nicknames for insert to authenticated
with check (user_id = auth.uid());

create policy "nick_upd_self"
on public.nicknames for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "nick_select_self"
on public.nicknames for select to authenticated
using (user_id = auth.uid());

-- 2) RPCs aware of canonical

-- rotate_claim_code(name): returns plaintext code once
create or replace function public.rotate_claim_code(p_name text)
returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  code := lpad((floor(random()*1000000))::int::text, 6, '0');
  update public.nicknames
     set claim_code_hash = crypt(code, gen_salt('bf'))
   where user_id = auth.uid()
     and user_unique_key = lower(regexp_replace(p_name, '\\s+', '', 'g'));
  if not found then
    raise exception 'nickname not owned by caller';
  end if;
  return code;
end $$;

revoke all on function public.rotate_claim_code(text) from public;
grant execute on function public.rotate_claim_code(text) to authenticated;

-- claim_nickname(name, code): transfer ownership by code
create or replace function public.claim_nickname(p_name text, p_code text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.nicknames
     set user_id = auth.uid()
   where user_unique_key = lower(regexp_replace(p_name, '\\s+', '', 'g'))
     and claim_code_hash is not null
     and crypt(p_code, claim_code_hash) = claim_code_hash;
  return found;
end $$;

revoke all on function public.claim_nickname(text, text) from public;
grant execute on function public.claim_nickname(text, text) to authenticated;

-- refresh API cache
notify pgrst, 'reload schema';
