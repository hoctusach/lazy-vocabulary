-- Migrate learned_words to user_unique_key based identity

-- Ensure profiles has a user_unique_key column and uniqueness for FK reference
alter table public.profiles add column if not exists user_unique_key text;

update public.profiles
   set user_unique_key = coalesce(user_unique_key, replace(user_id::text, '-', ''))
 where user_unique_key is null;

alter table public.profiles alter column user_unique_key set not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'profiles_user_unique_key_key'
  ) then
    alter table public.profiles
      add constraint profiles_user_unique_key_key unique (user_unique_key);
  end if;
end$$;

-- Add the new user_unique_key column to learned_words and backfill from profiles
alter table public.learned_words add column if not exists user_unique_key text;

update public.learned_words lw
   set user_unique_key = p.user_unique_key
  from public.profiles p
 where lw.user_unique_key is null
   and lw.user_id = p.user_id;

alter table public.learned_words alter column user_unique_key set not null;

-- Replace constraints to reference user_unique_key
alter table public.learned_words drop constraint if exists learned_words_pkey;
alter table public.learned_words drop constraint if exists learned_words_user_id_fkey;
alter table public.learned_words drop constraint if exists learned_words_user_unique_key_fkey;

alter table public.learned_words
  add constraint learned_words_pkey primary key (user_unique_key, word_id);

alter table public.learned_words
  add constraint learned_words_user_unique_key_fkey
  foreign key (user_unique_key)
  references public.profiles(user_unique_key)
  on update cascade
  on delete cascade;

-- Drop the legacy user_id column once backfill is complete
alter table public.learned_words drop column if exists user_id;

-- Refresh row level security policy to align with user_unique_key
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

-- RPC helper to fetch learned words by key
create or replace function public.get_learned_words_by_key(p_user_unique_key text)
returns setof text
language sql
security definer
set search_path = public
as $$
  select lw.word_id
    from public.learned_words lw
    join public.profiles p
      on p.user_unique_key = lw.user_unique_key
   where lw.user_unique_key = p_user_unique_key
     and p.user_id = auth.uid()
   order by lw.word_id;
$$;

grant execute on function public.get_learned_words_by_key(text) to anon, authenticated;

-- RPC to mark a word learned by unique key with progress summary response
create or replace function public.mark_word_learned_by_key(
  p_user_unique_key text,
  p_word_id text,
  p_marked_at timestamptz default now(),
  p_total_words integer default 0
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_marked_at timestamptz := coalesce(p_marked_at, now());
  v_total integer := greatest(coalesce(p_total_words, 0), 0);
  v_summary jsonb;
begin
  if coalesce(p_user_unique_key, '') = '' then
    raise exception 'user_unique_key is required';
  end if;
  if coalesce(p_word_id, '') = '' then
    raise exception 'word_id is required';
  end if;

  insert into public.learned_words (user_unique_key, word_id, in_review_queue, learned_at)
  values (p_user_unique_key, p_word_id, false, v_marked_at)
  on conflict (user_unique_key, word_id)
  do update set
    in_review_queue = excluded.in_review_queue,
    learned_at = excluded.learned_at;

  with progress as (
    select
      count(*) filter (where lw.in_review_queue) as learning_count,
      count(*) as learned_count,
      count(*) filter (
        where lw.in_review_queue
          and lw.learned_at <= now()
      ) as learning_due_count
    from public.learned_words lw
    where lw.user_unique_key = p_user_unique_key
  )
  select jsonb_build_object(
    'learning_count', coalesce(progress.learning_count, 0)::int,
    'learned_count', coalesce(progress.learned_count, 0)::int,
    'learning_due_count', coalesce(progress.learning_due_count, 0)::int,
    'remaining_count', greatest(v_total - coalesce(progress.learned_count, 0)::int, 0)
  )
  into v_summary
  from progress;

  return v_summary;
end;
$$;

grant execute on function public.mark_word_learned_by_key(text, text, timestamptz, integer) to anon, authenticated;

-- Let PostgREST refresh cached metadata
notify pgrst, 'reload schema';
