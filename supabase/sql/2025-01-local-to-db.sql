-- Core tables for Lazy Vocabulary cloud sync

create table if not exists public.defaultVocabulary (
  word text primary key,
  category text not null,
  meaning text not null,
  example text not null,
  translation text,
  count integer
);

create or replace view public.default_vocabulary as
select
  word,
  category,
  meaning,
  example,
  translation
from public."defaultVocabulary";

grant select on public.default_vocabulary to anon;
grant select on public.default_vocabulary to authenticated;

-- Row Level Security is not enabled on public."defaultVocabulary", so no view-specific
-- policies are required to mirror table access.

create table if not exists public.nicknames (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  name text not null,
  passcode int8,
  user_unique_key text not null unique
);

create table if not exists public.learned_words (
  user_unique_key text not null references public.nicknames(user_unique_key) on delete cascade,
  word_id text not null references public.defaultVocabulary(word),
  in_review_queue boolean not null default false,
  learned_at timestamptz not null default now(),
  review_count integer,
  last_review_at timestamptz,
  next_review_at timestamptz,
  next_display_at timestamptz,
  last_seen_at timestamptz,
  srs_interval_days integer,
  srs_easiness numeric,
  srs_state text,
  primary key (user_unique_key, word_id)
);

create table if not exists public.user_progress_summary (
  user_unique_key text primary key references public.nicknames(user_unique_key) on delete cascade,
  learning_count integer not null default 0,
  learned_count integer not null default 0,
  learning_due_count integer not null default 0,
  remaining_count integer not null default 0,
  updated_at timestamptz not null default now(),
  learning_time real not null default 0,
  learned_days text[] not null default '{}'
);
