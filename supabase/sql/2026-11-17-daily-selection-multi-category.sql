-- ============================================================================
-- STATUS: NOT APPLIED. DRAFT / SKELETON ONLY. The app does NOT call this function.
-- ============================================================================
--
-- Purpose (future improvement for multi-set mixing)
--   The client currently handles a mix of 2-5 built-in groups by calling
--   generate_daily_selection_v2(p_user_key, p_count, NULL) and filtering the rows
--   client-side, so the server quota (shared across all six groups) can deliver
--   fewer built-in words than the learner expects. v3 would take the selected groups
--   up front and spend the whole quota inside them, in ONE call, so is_today_selection
--   is committed once for exactly the groups the learner picked.
--
--   (Calling v2 once per category is NOT an option: each call resets is_today_selection
--   of the rows outside its category.)
--
-- Why this is a skeleton
--   The body of generate_daily_selection_v2 is not stored in this repository, and nothing
--   here may be run against the live database without review. Before applying:
--     1. In the Supabase SQL editor, dump the deployed v2:
--          select pg_get_functiondef('public.generate_daily_selection_v2(text,integer,text)'::regprocedure);
--     2. Copy its body into v3 below and replace its single-category predicate
--          (category = p_category or p_category is null)
--        with
--          (p_categories is null or cardinality(p_categories) = 0 or category = any (p_categories))
--        (normalise the 'phrases, collocation' / 'phrases, collocations' spelling the same
--        way v2 does), and balance the quota across the given categories instead of all six.
--     3. Keep the OUT/return columns identical to v2 so the client's row normaliser works
--        unchanged.
--   Until step 2 is done the function intentionally raises, so applying this file by
--   accident cannot change anyone's daily selection.
--
-- Client follow-up once applied: in src/services/learningProgressService.ts send
--   p_categories = selected groups (NULL for all six) and drop the client-side filter.

create or replace function public.generate_daily_selection_v3(
  p_user_key   text,
  p_count      int,
  p_categories text[]
)
returns setof record   -- TODO: replace with the exact return type of generate_daily_selection_v2
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- TODO: body copied from generate_daily_selection_v2 (see header). Do not ship as is.
  raise exception 'generate_daily_selection_v3 is a draft and has not been implemented yet'
    using errcode = 'feature_not_supported';
end;
$$;

-- Same exposure as v2: the app calls it with the anon key and a user key.
revoke all on function public.generate_daily_selection_v3(text, int, text[]) from public;
grant execute on function public.generate_daily_selection_v3(text, int, text[]) to anon, authenticated, service_role;
