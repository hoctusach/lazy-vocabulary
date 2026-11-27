-- 2026-11-22  Daily selection: 20 words TOTAL (FB-35, Option A)
--
-- ============================================================================
-- STATUS: NOT APPLIED. DRAFT / SKELETON ONLY. Do NOT run against live Supabase
-- without the owner. The app does not need this file to ship: it already sends
-- p_count = 20 to generate_daily_selection_v2.
-- ============================================================================
--
-- What the client now does
--   p_count = 20 for every signed-in built-in request (was 25 "light"; 50/100 for
--   moderate/intense, which no screen exposes any more). Imported sets are built
--   client-side (buildTodayQueue): due first, filled with new words to a total of 20.
--
-- What cannot be confirmed from this repo
--   The body of generate_daily_selection_v2 is NOT stored here. If it treats
--   p_count as the TOTAL number of rows it returns (reviews due first, then new
--   words up to p_count), then p_count = 20 already is Option A and this file is
--   unnecessary. If it treats p_count as the number of NEW words (reviews added on
--   top), or reserves a fixed share for reviews, the day would exceed or miss 20.
--
-- How to check (read-only, in the SQL editor)
--   select pg_get_functiondef('public.generate_daily_selection_v2(text,integer,text)'::regprocedure);
--   Then, for a test user with some due words, call it with p_count = 20 and count the rows:
--   total rows = 20  -> nothing to apply;  rows <> 20 or new-only count = 20 -> apply the change below.
--
-- What the change would be (to the deployed v2 body; same signature and OUT columns)
--   1. due   := learning rows whose next_review_at <= end of the user's local day,
--               ordered most overdue first, LIMIT p_count;
--   2. fresh := never-seen rows (category filter unchanged), LIMIT greatest(p_count - count(due), 0);
--   3. is_today_selection = true for exactly those <= p_count rows (reset the rest, as v2 does);
--   4. due_selected_today stays true only for the rows from step 1.
--   i.e. the SUM of (1) and (2) is p_count, never more; if reviews are scarce new words fill the rest.
--
-- Why this is a skeleton
--   Copying an unseen function body would be guesswork. Until the body from
--   pg_get_functiondef is pasted in, the function intentionally raises, so applying
--   this file by accident cannot change anyone's daily selection.

create or replace function public.generate_daily_selection_v2_total20(
  p_user_key text,
  p_count    int,
  p_category text
)
returns setof record   -- TODO: replace with the exact return type of generate_daily_selection_v2
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- TODO: body from generate_daily_selection_v2 with steps 1-4 above. Do not ship as is.
  raise exception 'generate_daily_selection_v2_total20 is a draft and has not been implemented yet'
    using errcode = 'feature_not_supported';
end;
$$;

revoke all on function public.generate_daily_selection_v2_total20(text, int, text) from public;
grant execute on function public.generate_daily_selection_v2_total20(text, int, text) to anon, authenticated, service_role;
