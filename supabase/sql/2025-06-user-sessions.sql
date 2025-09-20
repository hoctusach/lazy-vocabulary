set search_path = public;

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

create or replace function public.require_session_user_key(expected_key text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actual text := public.current_session_user_key();
begin
  if expected_key is null or btrim(expected_key) = '' then
    raise exception 'user_unique_key is required';
  end if;
  if actual is null or actual <> expected_key then
    raise exception 'permission denied for key %', expected_key using errcode = '42501';
  end if;
end;
$$;

create table if not exists public.user_sessions (
  session_token text primary key,
  user_unique_key text not null references public.nicknames(user_unique_key) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists user_sessions_user_key_idx on public.user_sessions(user_unique_key);
create index if not exists user_sessions_expires_at_idx on public.user_sessions(expires_at);

alter table public.user_sessions enable row level security;

drop policy if exists "user_sessions_manage_own" on public.user_sessions;

create policy "user_sessions_manage_own"
on public.user_sessions
for all
using (
  session_token = public.current_session_token()
)
with check (
  session_token = public.current_session_token()
);

alter table public.learned_words enable row level security;
alter table public.user_progress_summary enable row level security;

drop policy if exists "learned_words_by_session" on public.learned_words;
drop policy if exists "user_progress_by_session" on public.user_progress_summary;

create policy "learned_words_by_session"
on public.learned_words
for all
using (user_unique_key = public.current_session_user_key())
with check (user_unique_key = public.current_session_user_key());

create policy "user_progress_by_session"
on public.user_progress_summary
for all
using (user_unique_key = public.current_session_user_key())
with check (user_unique_key = public.current_session_user_key());

notify pgrst, 'reload schema';
