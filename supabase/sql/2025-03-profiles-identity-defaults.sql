-- Ensure learned_words policy enforces ownership via profiles.user_unique_key
set search_path = public;

drop policy if exists "learned_self_rw" on public.learned_words;

create policy "learned_self_rw"
on public.learned_words for all
using (
  exists (
    select 1
      from public.profiles p
     where p.user_unique_key = learned_words.user_unique_key
       and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
      from public.profiles p
     where p.user_unique_key = learned_words.user_unique_key
       and p.user_id = auth.uid()
  )
);

-- Automatically populate identity columns on profiles inserts/updates
create or replace function public.profiles_identity_defaults()
returns trigger
language plpgsql
as $$
declare
  sanitized_uid text := replace(new.user_id::text, '-', '');
  base_nickname text := coalesce(nullif(new.nickname, ''), 'Learner-' || sanitized_uid);
begin
  if coalesce(new.user_unique_key, '') = '' then
    new.user_unique_key := sanitized_uid;
  end if;

  if coalesce(new.nickname, '') = '' then
    new.nickname := base_nickname;
  end if;

  if coalesce(new.nickname_canon, '') = '' then
    new.nickname_canon := lower(regexp_replace(new.nickname, '\s+', '', 'g'));
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_identity_defaults on public.profiles;

create trigger profiles_identity_defaults
before insert or update on public.profiles
for each row
execute function public.profiles_identity_defaults();

-- Ensure every auth user receives a profile row with populated identity columns
create or replace function public.ensure_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sanitized_uid text := replace(new.id::text, '-', '');
  default_nickname text := 'Learner-' || sanitized_uid;
begin
  insert into public.profiles (user_id, nickname, nickname_canon, user_unique_key)
  values (
    new.id,
    default_nickname,
    lower(regexp_replace(default_nickname, '\s+', '', 'g')),
    sanitized_uid
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ensure_profile_for_new_user on auth.users;

create trigger ensure_profile_for_new_user
after insert on auth.users
for each row
execute function public.ensure_profile_for_auth_user();

-- Backfill any existing auth users missing a profile row
insert into public.profiles (user_id, nickname, nickname_canon, user_unique_key)
select
  u.id,
  'Learner-' || replace(u.id::text, '-', ''),
  lower(regexp_replace('Learner-' || replace(u.id::text, '-', ''), '\s+', '', 'g')),
  replace(u.id::text, '-', '')
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;

-- Ensure any legacy rows without keys are aligned
update public.profiles
   set user_unique_key = replace(user_id::text, '-', '')
 where coalesce(user_unique_key, '') = '';

notify pgrst, 'reload schema';
