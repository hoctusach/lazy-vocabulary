-- identity already exists:
-- table public.nicknames(id uuid pk default gen_random_uuid(), name text unique not null, created_at timestamptz default now());
-- RLS enabled; anon insert allowed (from prior step).

-- 1) resume_state (per category + today)
create table if not exists public.resume_state (
  name text not null,               -- nickname
  category text not null default 'all',
  last_word_key text,               -- todayLastWord.word or lastWordByCategory[category]
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (name, category)
);

-- 2) learning_progress (per word)
create table if not exists public.learning_progress (
  name text not null,
  word_key text not null,
  category text,
  status smallint,                  -- enum-like 0..n
  review_count int default 0,
  next_review_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (name, word_key)
);

-- 3) daily_selection (1 row/day)
create table if not exists public.daily_selection (
  name text not null,
  day date not null,
  selection_json jsonb not null,    -- compact array/object
  updated_at timestamptz not null default now(),
  primary key (name, day)
);

-- 4) learning_time (aggregated per day)
create table if not exists public.learning_time (
  name text not null,
  day date not null,
  duration_ms bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (name, day)
);

-- 5) word_counts (per word counter)
create table if not exists public.word_counts (
  name text not null,
  word_key text not null,
  count int not null default 0,
  last_shown_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (name, word_key)
);

-- Indexing (cheap but helpful)
create index if not exists idx_progress_name_updated on public.learning_progress(name, updated_at desc);
create index if not exists idx_time_name_day on public.learning_time(name, day);
create index if not exists idx_selection_name_day on public.daily_selection(name, day);

-- Minimal RLS: enable and allow anon upsert for Phase-1 (write-only). No SELECT policies.
alter table public.resume_state enable row level security;
alter table public.learning_progress enable row level security;
alter table public.daily_selection enable row level security;
alter table public.learning_time enable row level security;
alter table public.word_counts enable row level security;

-- INSERT and UPDATE for anon/auth (Phase-1; not secure, acceptable for non-PII prototype).
do $$ begin
  perform 1;
  exception when others then null;
end $$;

create policy if not exists "p1_resume_ins" on public.resume_state
for insert to anon, authenticated with check (true);
create policy if not exists "p1_resume_upd" on public.resume_state
for update to anon, authenticated using (true) with check (true);

create policy if not exists "p1_prog_ins" on public.learning_progress
for insert to anon, authenticated with check (true);
create policy if not exists "p1_prog_upd" on public.learning_progress
for update to anon, authenticated using (true) with check (true);

create policy if not exists "p1_sel_ins" on public.daily_selection
for insert to anon, authenticated with check (true);
create policy if not exists "p1_sel_upd" on public.daily_selection
for update to anon, authenticated using (true) with check (true);

create policy if not exists "p1_time_ins" on public.learning_time
for insert to anon, authenticated with check (true);
create policy if not exists "p1_time_upd" on public.learning_time
for update to anon, authenticated using (true) with check (true);

create policy if not exists "p1_wc_ins" on public.word_counts
for insert to anon, authenticated with check (true);
create policy if not exists "p1_wc_upd" on public.word_counts
for update to anon, authenticated using (true) with check (true);

-- NOTE: We intentionally do NOT create SELECT policies in Phase-1 (no reads from client).
-- Later, when Auth is added, replace these permissive policies with user-scoped RLS.
