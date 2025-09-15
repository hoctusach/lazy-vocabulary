-- docs/supabase-nicknames.sql
create extension if not exists pgcrypto;

create table if not exists public.nicknames (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.nicknames enable row level security;

create policy "nicknames_insert_anon_auth"
on public.nicknames
for insert
to anon, authenticated
with check (true);

-- Note: we intentionally do NOT create a SELECT policy; we detect duplicates via the UNIQUE constraint (error 23505).
