-- Persist learning progress & preferences in Supabase

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  nickname_canon text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ux_profiles_nickname_canon on profiles(nickname_canon);

create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorite_voice text,
  speech_rate numeric,
  is_muted boolean not null default false,
  is_playing boolean not null default false,
  daily_option text,
  updated_at timestamptz not null default now()
);

create table if not exists learned_words (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null,
  in_review_queue boolean not null default false,
  learned_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table learned_words enable row level security;

drop policy if exists "profiles_self_rw" on profiles;
create policy "profiles_self_rw"
on profiles for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "prefs_self_rw" on user_preferences;
create policy "prefs_self_rw"
on user_preferences for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "learned_self_rw" on learned_words;
create policy "learned_self_rw"
on learned_words for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
