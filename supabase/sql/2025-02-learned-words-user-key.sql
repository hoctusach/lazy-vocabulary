-- Align learned_words helpers with nicknames.user_unique_key

alter table public.learned_words
  add column if not exists user_unique_key text;

update public.learned_words lw
   set user_unique_key = n.user_unique_key
  from public.nicknames n
 where lw.user_unique_key is null
   and lower(replace(lw.word_id, ' ', '')) = lower(replace(n.name, ' ', ''));

alter table public.learned_words alter column user_unique_key set not null;

alter table public.learned_words drop constraint if exists learned_words_pkey;
alter table public.learned_words drop constraint if exists learned_words_user_unique_key_fkey;

alter table public.learned_words
  add constraint learned_words_pkey primary key (user_unique_key, word_id);

alter table public.learned_words
  add constraint learned_words_user_unique_key_fkey
  foreign key (user_unique_key)
  references public.nicknames(user_unique_key)
  on update cascade
  on delete cascade;

create or replace function public.get_learned_words_by_key(p_user_unique_key text)
returns setof text
language sql
security definer
set search_path = public
as $$
  select public.require_session_user_key(p_user_unique_key);
  select lw.word_id
    from public.learned_words lw
   where lw.user_unique_key = p_user_unique_key
   order by lw.word_id;
$$;

grant execute on function public.get_learned_words_by_key(text) to anon, authenticated;

create or replace function public.mark_word_learned_by_key(
  p_user_unique_key text,
  p_word_id text,
  p_marked_at timestamptz default now(),
  p_total_words integer default 0,
  p_in_review_queue boolean default false,
  p_review_count integer default null,
  p_last_review_at timestamptz default null,
  p_next_review_at timestamptz default null,
  p_next_display_at timestamptz default null,
  p_last_seen_at timestamptz default null,
  p_srs_interval_days integer default null,
  p_srs_easiness numeric default null,
  p_srs_state text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marked_at timestamptz := coalesce(p_marked_at, now());
  v_total integer := greatest(coalesce(p_total_words, 0), 0);
  v_summary jsonb;
begin
  perform public.require_session_user_key(p_user_unique_key);
  if coalesce(p_user_unique_key, '') = '' then
    raise exception 'user_unique_key is required';
  end if;
  if coalesce(p_word_id, '') = '' then
    raise exception 'word_id is required';
  end if;

  insert into public.learned_words (
    user_unique_key,
    word_id,
    in_review_queue,
    learned_at,
    review_count,
    last_review_at,
    next_review_at,
    next_display_at,
    last_seen_at,
    srs_interval_days,
    srs_easiness,
    srs_state
  )
  values (
    p_user_unique_key,
    p_word_id,
    coalesce(p_in_review_queue, false),
    v_marked_at,
    p_review_count,
    coalesce(p_last_review_at, v_marked_at),
    p_next_review_at,
    coalesce(p_next_display_at, p_next_review_at),
    coalesce(p_last_seen_at, v_marked_at),
    p_srs_interval_days,
    p_srs_easiness,
    p_srs_state
  )
  on conflict (user_unique_key, word_id)
  do update set
    in_review_queue = excluded.in_review_queue,
    learned_at = excluded.learned_at,
    review_count = excluded.review_count,
    last_review_at = excluded.last_review_at,
    next_review_at = excluded.next_review_at,
    next_display_at = excluded.next_display_at,
    last_seen_at = excluded.last_seen_at,
    srs_interval_days = excluded.srs_interval_days,
    srs_easiness = excluded.srs_easiness,
    srs_state = excluded.srs_state;

  with progress as (
    select
      count(*) filter (where lw.in_review_queue) as learning_count,
      count(*) filter (where not lw.in_review_queue) as learned_count,
      count(*) filter (
        where lw.in_review_queue
          and coalesce(lw.next_review_at, lw.learned_at) <= now()
      ) as learning_due_count
    from public.learned_words lw
    where lw.user_unique_key = p_user_unique_key
  )
  insert into public.user_progress_summary (
    user_unique_key,
    learning_count,
    learned_count,
    learning_due_count,
    remaining_count,
    learning_time,
    learned_days,
    updated_at
  )
  select
    p_user_unique_key,
    coalesce(progress.learning_count, 0),
    coalesce(progress.learned_count, 0),
    coalesce(progress.learning_due_count, 0),
    greatest(v_total - coalesce(progress.learned_count, 0), 0),
    coalesce(ups.learning_time, 0),
    coalesce(ups.learned_days, '{}'::text[]),
    now()
  from progress
  left join public.user_progress_summary ups
    on ups.user_unique_key = p_user_unique_key
  on conflict (user_unique_key) do update set
    learning_count = excluded.learning_count,
    learned_count = excluded.learned_count,
    learning_due_count = excluded.learning_due_count,
    remaining_count = excluded.remaining_count,
    updated_at = excluded.updated_at;

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

grant execute on function public.mark_word_learned_by_key(
  text,
  text,
  timestamptz,
  integer,
  boolean,
  integer,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  integer,
  numeric,
  text
) to anon, authenticated;

notify pgrst, 'reload schema';
