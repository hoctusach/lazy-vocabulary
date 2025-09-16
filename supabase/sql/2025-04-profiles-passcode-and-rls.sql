-- Harden profile credentials and unify per-user data access
set search_path = public;

create extension if not exists pgcrypto;

-- Ensure profiles can store hashed passcodes and enforce nickname uniqueness
alter table public.profiles add column if not exists passcode_hash text;
create unique index if not exists ux_profiles_nickname on public.profiles(nickname);

-- Helper function to sanitize a uuid into a compact key
create or replace function public.sanitize_uuid(p_value uuid)
returns text
language sql
immutable
as $$
  select replace(p_value::text, '-', '');
$$;

-- Generic trigger to populate user_unique_key from auth.uid() when not provided
create or replace function public.ensure_row_user_unique_key()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if coalesce(new.user_unique_key, '') = '' then
    if v_uid is not null then
      new.user_unique_key := sanitize_uuid(v_uid);
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.set_profile_passcode(p_passcode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(p_passcode, '') = '' then
    raise exception 'passcode required';
  end if;

  update public.profiles
     set passcode_hash = crypt(p_passcode, gen_salt('bf')),
         updated_at = now()
   where user_id = auth.uid();

  if not found then
    raise exception 'profile not found for user';
  end if;
end;
$$;

create or replace function public.verify_profile_passcode(p_nickname text, p_passcode text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_key text;
begin
  if coalesce(p_nickname, '') = '' then
    raise exception 'nickname required';
  end if;

  select passcode_hash, user_unique_key
    into v_hash, v_key
    from public.profiles
   where nickname_canon = lower(regexp_replace(p_nickname, '\\s+', '', 'g'))
   limit 1;

  if v_hash is null or coalesce(v_hash, '') = '' then
    return null;
  end if;

  if crypt(p_passcode, v_hash) = v_hash then
    return v_key;
  end if;
  return null;
end;
$$;

revoke all on function public.set_profile_passcode(text) from public;
grant execute on function public.set_profile_passcode(text) to authenticated;

revoke all on function public.verify_profile_passcode(text, text) from public;
grant execute on function public.verify_profile_passcode(text, text) to anon, authenticated;

-- USER PREFERENCES ---------------------------------------------------------
create table if not exists public.user_preferences (
  user_unique_key text primary key,
  favorite_voice text,
  speech_rate numeric,
  is_muted boolean not null default false,
  is_playing boolean not null default false,
  daily_option text,
  updated_at timestamptz not null default now(),
  constraint user_preferences_user_unique_key_fkey
    foreign key (user_unique_key)
    references public.profiles(user_unique_key)
    on update cascade
    on delete cascade
);

alter table public.user_preferences add column if not exists user_unique_key text;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'user_preferences'
       and column_name = 'user_id'
  ) then
    update public.user_preferences up
       set user_unique_key = p.user_unique_key
      from public.profiles p
     where coalesce(up.user_unique_key, '') = ''
       and coalesce(up.user_id::text, '') <> ''
       and p.user_id = up.user_id;
  end if;
end$$;

alter table public.user_preferences
  alter column user_unique_key set not null;

alter table public.user_preferences drop constraint if exists user_preferences_pkey;
alter table public.user_preferences
  add constraint user_preferences_pkey primary key (user_unique_key);

alter table public.user_preferences drop constraint if exists user_preferences_user_unique_key_fkey;
alter table public.user_preferences
  add constraint user_preferences_user_unique_key_fkey
  foreign key (user_unique_key)
  references public.profiles(user_unique_key)
  on update cascade
  on delete cascade;

alter table public.user_preferences drop column if exists user_id;
alter table public.user_preferences alter column updated_at set default now();

alter table public.user_preferences enable row level security;

drop policy if exists "prefs_self_rw" on public.user_preferences;
drop policy if exists "user_preferences_self_select" on public.user_preferences;
drop policy if exists "user_preferences_self_insert" on public.user_preferences;
drop policy if exists "user_preferences_self_update" on public.user_preferences;

create policy "user_preferences_select"
  on public.user_preferences
  for select
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.user_preferences.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "user_preferences_insert"
  on public.user_preferences
  for insert
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.user_preferences.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "user_preferences_update"
  on public.user_preferences
  for update
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.user_preferences.user_unique_key
         and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.user_preferences.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create or replace trigger user_preferences_identity_defaults
before insert or update on public.user_preferences
for each row
execute function public.ensure_row_user_unique_key();

-- LEARNING PROGRESS --------------------------------------------------------
create table if not exists public.learning_progress (
  user_unique_key text not null,
  word_key text not null,
  category text,
  status text,
  review_count integer,
  next_review_at timestamptz,
  learned_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint learning_progress_user_unique_key_fkey
    foreign key (user_unique_key)
    references public.profiles(user_unique_key)
    on update cascade
    on delete cascade,
  constraint learning_progress_pkey
    primary key (user_unique_key, word_key)
);

alter table public.learning_progress add column if not exists user_unique_key text;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'learning_progress'
       and column_name = 'name'
  ) then
    update public.learning_progress lp
       set user_unique_key = p.user_unique_key
      from public.profiles p
     where coalesce(lp.user_unique_key, '') = ''
       and lower(regexp_replace(coalesce(lp.name, ''), '\\s+', '', 'g')) = p.nickname_canon;
  end if;
end$$;

update public.learning_progress
   set user_unique_key = coalesce(user_unique_key, sanitize_uuid(gen_random_uuid()))
 where coalesce(user_unique_key, '') = '';

alter table public.learning_progress
  alter column user_unique_key set not null;

alter table public.learning_progress drop constraint if exists learning_progress_pkey;
alter table public.learning_progress
  add constraint learning_progress_pkey primary key (user_unique_key, word_key);

alter table public.learning_progress drop constraint if exists learning_progress_user_unique_key_fkey;
alter table public.learning_progress
  add constraint learning_progress_user_unique_key_fkey
  foreign key (user_unique_key)
  references public.profiles(user_unique_key)
  on update cascade
  on delete cascade;

alter table public.learning_progress alter column updated_at set default now();

alter table public.learning_progress enable row level security;

drop policy if exists "learning_progress_self" on public.learning_progress;
drop policy if exists "learning_progress_self_rw" on public.learning_progress;
drop policy if exists "learning_progress_select" on public.learning_progress;
drop policy if exists "learning_progress_modify" on public.learning_progress;

create policy "learning_progress_select"
  on public.learning_progress
  for select
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.learning_progress.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "learning_progress_upsert"
  on public.learning_progress
  for insert
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.learning_progress.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "learning_progress_update"
  on public.learning_progress
  for update
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.learning_progress.user_unique_key
         and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.learning_progress.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create or replace trigger learning_progress_identity_defaults
before insert or update on public.learning_progress
for each row
execute function public.ensure_row_user_unique_key();

-- WORD COUNTS --------------------------------------------------------------
create table if not exists public.word_counts (
  user_unique_key text not null,
  word_key text not null,
  count integer not null default 0,
  last_shown_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint word_counts_user_unique_key_fkey
    foreign key (user_unique_key)
    references public.profiles(user_unique_key)
    on update cascade
    on delete cascade,
  constraint word_counts_pkey
    primary key (user_unique_key, word_key)
);

alter table public.word_counts add column if not exists user_unique_key text;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'word_counts'
       and column_name = 'name'
  ) then
    update public.word_counts wc
       set user_unique_key = p.user_unique_key
      from public.profiles p
     where coalesce(wc.user_unique_key, '') = ''
       and lower(regexp_replace(coalesce(wc.name, ''), '\\s+', '', 'g')) = p.nickname_canon;
  end if;
end$$;

update public.word_counts
   set user_unique_key = coalesce(user_unique_key, sanitize_uuid(gen_random_uuid()))
 where coalesce(user_unique_key, '') = '';

alter table public.word_counts
  alter column user_unique_key set not null;

alter table public.word_counts drop constraint if exists word_counts_pkey;
alter table public.word_counts
  add constraint word_counts_pkey primary key (user_unique_key, word_key);

alter table public.word_counts drop constraint if exists word_counts_user_unique_key_fkey;
alter table public.word_counts
  add constraint word_counts_user_unique_key_fkey
  foreign key (user_unique_key)
  references public.profiles(user_unique_key)
  on update cascade
  on delete cascade;

alter table public.word_counts alter column updated_at set default now();

alter table public.word_counts enable row level security;

drop policy if exists "word_counts_self" on public.word_counts;
drop policy if exists "word_counts_self_rw" on public.word_counts;
drop policy if exists "word_counts_select" on public.word_counts;
drop policy if exists "word_counts_insert" on public.word_counts;
drop policy if exists "word_counts_update" on public.word_counts;

create policy "word_counts_select"
  on public.word_counts
  for select
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.word_counts.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "word_counts_insert"
  on public.word_counts
  for insert
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.word_counts.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "word_counts_update"
  on public.word_counts
  for update
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.word_counts.user_unique_key
         and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.word_counts.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create or replace trigger word_counts_identity_defaults
before insert or update on public.word_counts
for each row
execute function public.ensure_row_user_unique_key();

-- DAILY SELECTION ----------------------------------------------------------
create table if not exists public.daily_selection (
  user_unique_key text not null,
  selection_date date not null,
  selection_json jsonb not null,
  updated_at timestamptz not null default now(),
  constraint daily_selection_user_unique_key_fkey
    foreign key (user_unique_key)
    references public.profiles(user_unique_key)
    on update cascade
    on delete cascade,
  constraint daily_selection_pkey
    primary key (user_unique_key, selection_date)
);

alter table public.daily_selection add column if not exists user_unique_key text;
alter table public.daily_selection add column if not exists selection_date date;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'daily_selection'
       and column_name = 'name'
  ) then
    update public.daily_selection ds
       set user_unique_key = p.user_unique_key
      from public.profiles p
     where coalesce(ds.user_unique_key, '') = ''
       and lower(regexp_replace(coalesce(ds.name, ''), '\\s+', '', 'g')) = p.nickname_canon;
  end if;
end$$;

update public.daily_selection
   set user_unique_key = coalesce(user_unique_key, sanitize_uuid(gen_random_uuid()))
 where coalesce(user_unique_key, '') = '';

alter table public.daily_selection
  alter column user_unique_key set not null;

alter table public.daily_selection drop constraint if exists daily_selection_pkey;
alter table public.daily_selection
  add constraint daily_selection_pkey primary key (user_unique_key, selection_date);

alter table public.daily_selection drop constraint if exists daily_selection_user_unique_key_fkey;
alter table public.daily_selection
  add constraint daily_selection_user_unique_key_fkey
  foreign key (user_unique_key)
  references public.profiles(user_unique_key)
  on update cascade
  on delete cascade;

alter table public.daily_selection alter column updated_at set default now();

alter table public.daily_selection enable row level security;

drop policy if exists "daily_selection_self" on public.daily_selection;
drop policy if exists "daily_selection_self_rw" on public.daily_selection;
drop policy if exists "daily_selection_select" on public.daily_selection;
drop policy if exists "daily_selection_insert" on public.daily_selection;
drop policy if exists "daily_selection_update" on public.daily_selection;

create policy "daily_selection_select"
  on public.daily_selection
  for select
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.daily_selection.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "daily_selection_insert"
  on public.daily_selection
  for insert
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.daily_selection.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "daily_selection_update"
  on public.daily_selection
  for update
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.daily_selection.user_unique_key
         and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.daily_selection.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create or replace trigger daily_selection_identity_defaults
before insert or update on public.daily_selection
for each row
execute function public.ensure_row_user_unique_key();

-- RESUME STATE -------------------------------------------------------------
create table if not exists public.resume_state (
  user_unique_key text not null,
  category text not null default '__aggregate__',
  last_word_key text,
  last_seen_at timestamptz,
  today_json jsonb,
  by_category_json jsonb,
  updated_at timestamptz not null default now(),
  constraint resume_state_user_unique_key_fkey
    foreign key (user_unique_key)
    references public.profiles(user_unique_key)
    on update cascade
    on delete cascade,
  constraint resume_state_pkey
    primary key (user_unique_key, category)
);

alter table public.resume_state add column if not exists user_unique_key text;
alter table public.resume_state add column if not exists category text;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'resume_state'
       and column_name = 'name'
  ) then
    update public.resume_state rs
       set user_unique_key = p.user_unique_key
      from public.profiles p
     where coalesce(rs.user_unique_key, '') = ''
       and lower(regexp_replace(coalesce(rs.name, ''), '\\s+', '', 'g')) = p.nickname_canon;
  end if;
end$$;

update public.resume_state
   set user_unique_key = coalesce(user_unique_key, sanitize_uuid(gen_random_uuid()))
 where coalesce(user_unique_key, '') = '';

alter table public.resume_state
  alter column user_unique_key set not null;

update public.resume_state
   set category = coalesce(nullif(category, ''), '__aggregate__');

alter table public.resume_state
  alter column category set default '__aggregate__';

alter table public.resume_state drop constraint if exists resume_state_pkey;
alter table public.resume_state
  add constraint resume_state_pkey primary key (user_unique_key, category);

alter table public.resume_state drop constraint if exists resume_state_user_unique_key_fkey;
alter table public.resume_state
  add constraint resume_state_user_unique_key_fkey
  foreign key (user_unique_key)
  references public.profiles(user_unique_key)
  on update cascade
  on delete cascade;

alter table public.resume_state alter column updated_at set default now();

alter table public.resume_state enable row level security;

drop policy if exists "resume_state_self" on public.resume_state;
drop policy if exists "resume_state_self_rw" on public.resume_state;
drop policy if exists "resume_state_select" on public.resume_state;
drop policy if exists "resume_state_insert" on public.resume_state;
drop policy if exists "resume_state_update" on public.resume_state;

create policy "resume_state_select"
  on public.resume_state
  for select
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.resume_state.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "resume_state_insert"
  on public.resume_state
  for insert
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.resume_state.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "resume_state_update"
  on public.resume_state
  for update
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.resume_state.user_unique_key
         and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.resume_state.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create or replace trigger resume_state_identity_defaults
before insert or update on public.resume_state
for each row
execute function public.ensure_row_user_unique_key();

-- LEARNING TIME ------------------------------------------------------------
create table if not exists public.learning_time (
  user_unique_key text not null,
  day_iso date not null,
  duration_ms integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint learning_time_user_unique_key_fkey
    foreign key (user_unique_key)
    references public.profiles(user_unique_key)
    on update cascade
    on delete cascade,
  constraint learning_time_pkey
    primary key (user_unique_key, day_iso)
);

alter table public.learning_time add column if not exists user_unique_key text;
alter table public.learning_time add column if not exists day_iso date;

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'learning_time'
       and column_name = 'name'
  ) then
    update public.learning_time lt
       set user_unique_key = p.user_unique_key
      from public.profiles p
     where coalesce(lt.user_unique_key, '') = ''
       and lower(regexp_replace(coalesce(lt.name, ''), '\\s+', '', 'g')) = p.nickname_canon;
  end if;
end$$;

update public.learning_time
   set user_unique_key = coalesce(user_unique_key, sanitize_uuid(gen_random_uuid()))
 where coalesce(user_unique_key, '') = '';

alter table public.learning_time
  alter column user_unique_key set not null;

alter table public.learning_time drop constraint if exists learning_time_pkey;
alter table public.learning_time
  add constraint learning_time_pkey primary key (user_unique_key, day_iso);

alter table public.learning_time drop constraint if exists learning_time_user_unique_key_fkey;
alter table public.learning_time
  add constraint learning_time_user_unique_key_fkey
  foreign key (user_unique_key)
  references public.profiles(user_unique_key)
  on update cascade
  on delete cascade;

alter table public.learning_time alter column updated_at set default now();

alter table public.learning_time enable row level security;

drop policy if exists "learning_time_self" on public.learning_time;
drop policy if exists "learning_time_self_rw" on public.learning_time;
drop policy if exists "learning_time_select" on public.learning_time;
drop policy if exists "learning_time_insert" on public.learning_time;
drop policy if exists "learning_time_update" on public.learning_time;

create policy "learning_time_select"
  on public.learning_time
  for select
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.learning_time.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "learning_time_insert"
  on public.learning_time
  for insert
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.learning_time.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create policy "learning_time_update"
  on public.learning_time
  for update
  using (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.learning_time.user_unique_key
         and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
        from public.profiles p
       where p.user_unique_key = public.learning_time.user_unique_key
         and p.user_id = auth.uid()
    )
  );

create or replace trigger learning_time_identity_defaults
before insert or update on public.learning_time
for each row
execute function public.ensure_row_user_unique_key();

-- REFRESH METADATA ---------------------------------------------------------
notify pgrst, 'reload schema';
