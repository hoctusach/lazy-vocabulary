-- =====================================================================================
-- 2026-11-24  generate_daily_selection_v2: daily TOTAL = active + learned today, due first, always filled (FB-51)
--
-- *** STATUS: NOT APPLIED. DRAFT. Do NOT run against live Supabase without the owner. ***
-- The app does not need this file to ship: the 1.0.6 client tops the day up on the device and ignores
-- prior-day learned rows, so it behaves correctly against the CURRENT live function too.
--
-- Reference: read-only snapshot of the live body taken 2026-11-24 (Asia/Saigon) from project
-- vijvcojvemkzgpzpowzh (kept outside the repo, /workspace/design/generate_daily_selection_v2.live.sql, 894 lines).
-- Before applying anything: save `select pg_get_functiondef('public.generate_daily_selection_v2(text,integer,text)'::regprocedure);`
-- as the rollback script, run this on a Supabase branch / staging copy first, and compare row counts for a test user.
--
-- What is wrong in the live function (cited by its own comments/steps):
--   1. `p_count integer DEFAULT 10` (and COALESCE(p_count, 10)): any caller that omits p_count gets 10, not 20.
--      The 25 ceiling (v_max_per_call) is fine and is kept.
--   2. Step 1 short-circuit: `v_existing_cnt_active >= v_effective_count` counts only today's rows with
--      srs_state <> 'learned'. Words marked learned TODAY do not count toward the day, so after N marks the function
--      keeps topping up past 20 or the list looks short, depending on timing.
--   3. Step 3-5 plan the split from the PLANNED due cap, not from what was actually picked:
--        v_due_limit := floor(v_target * 0.9)  -> 18 of 20, LEAST(.., v_due_actual)
--        v_new_limit := v_target - v_due_limit -> only 2 new
--      Due rows are then picked with per-category FLOOR quotas (topic .25, phrasal .50, idioms .10, grammar .07)
--      plus a hardcoded 1 + 1 for word formation / collocations. FLOOR undershoots (18 -> 4+9+1+1 = 15 ... fewer when a
--      category has fewer due rows than its quota) and unused due slots are NOT given back to new words, because
--      v_new_limit was computed before the pick (v_due_actual is overwritten by GET DIAGNOSTICS afterwards and never
--      used). A real day of "7 due + 3 new" (= 10) is exactly this. A second, silent shrink: the "ONE special word per
--      day" cleanups (word formation + phrases, collocations) flip is_today_selection back to false for extras.
--   4. Step 7 (and the early return) always UNION ALL a `learned_rows` CTE: every learned word with
--      mark_learned_at <= today, LIMIT 100. That is why the client's LEARNED list showed words from earlier days.
--   5. The function joins public.default_vocabulary (a view over all 4000 default_vocabulary_base rows) while the
--      shipped bundle has 3,261 rows / 3,036 unique words (~739 server-only). Not fixable here; the client drops them
--      and tops up from the bundle (FB-51). Longer term: ship them in the bundle or retire them server-side.
--
-- What this draft changes (same signature, same OUT columns, same table side effects for picked words):
--   * p_count DEFAULT 20 (was 10); still clamped to 1..25.
--   * The day's size is p_count = (active today) + (learned today). v_target = p_count - active - learned_today.
--   * Fill is DUE FIRST (most overdue first, no category quotas, no 90/10 split) until due runs out, THEN NEW words
--     for ALL remaining slots (v_target - actually picked due). New words are spread round-robin over the categories
--     (or the single p_category), so leftover slots are always filled by whatever category still has words.
--   * The "max one word formation / phrases, collocations word per day" rule is kept, but only when p_category IS NULL
--     (with a single-group selection it silently reduced the day to ONE word); it never removes already-selected words.
--   * The return set is today's selection plus words marked learned TODAY only. The historical learned_rows
--     (<= today, LIMIT 100) are no longer returned. Counts for the all-time Learned tile come from the summary
--     columns (learned_count etc.), which are computed on every call (the live early return left them NULL).
--   Side effects on picked due words are unchanged (review_count + 1, next interval, is_today_selection, due flag).
--
-- Compatibility: the 1.0.5/1.0.6 client reads learned_count / learning_count / remaining_count / v_learned_days from
-- any row and treats rows with is_today_selection = false as "not today"; learned-today rows come back with
-- is_today_selection = true (as today_rows do in the live function) and srs_state = 'learned'.
--
-- Rollback: re-run the saved pg_get_functiondef output.
-- =====================================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_daily_selection_v2(
  p_user_key text,
  p_count integer DEFAULT 20,
  p_category text DEFAULT NULL::text
)
 RETURNS TABLE(word_id text, category text, word text, meaning text, example text, translation text, learned_at timestamp with time zone, review_count integer, last_review_at timestamp with time zone, next_review_at timestamp with time zone, srs_interval_days integer, srs_ease numeric, srs_state text, user_unique_key text, mark_learned_at date, updated_at timestamp with time zone, is_today_selection boolean, due_selected_today boolean, learning_count integer, learned_count integer, learning_due_count integer, remaining_count integer, v_learned_days text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_timezone              text;
  v_today_date            date;
  v_max_per_call constant int := 25;
  v_effective_count       int;
  v_active                int;   -- today's selection, not learned
  v_learned_today         int;   -- marked learned today
  v_target                int;   -- slots still to fill
  v_due_picked            int := 0;
  v_new_needed            int := 0;
  v_has_special_today     boolean := false;
  v_learning_count        int;
  v_learned_count         int;
  v_learning_due_count    int;
  v_remaining_count       int;
  v_learned_days          text[];
  v_days_learned          int;
  v_learning_words_total  int;
BEGIN
  SELECT COALESCE(n.timezone, 'Asia/Ho_Chi_Minh') INTO v_timezone
  FROM public.nicknames n
  WHERE n.user_unique_key = p_user_key
  LIMIT 1;
  v_timezone := COALESCE(v_timezone, 'Asia/Ho_Chi_Minh');

  PERFORM set_config('TimeZone', v_timezone, true);
  v_today_date := (NOW() AT TIME ZONE v_timezone)::date;

  v_effective_count := LEAST(GREATEST(COALESCE(p_count, 20), 1), v_max_per_call);

  PERFORM pg_advisory_xact_lock(hashtext('daily_selection:' || p_user_key || ':' || coalesce(p_category,'')));

  -- Step 1: what does today already contain? (active + marked learned today, same category scope)
  SELECT COUNT(*) INTO v_active
  FROM public.learned_words lw
  JOIN public.default_vocabulary dv ON dv.word_id = lw.word_id
  WHERE lw.user_unique_key = p_user_key
    AND COALESCE(lw.is_today_selection, false) = true
    AND ((lw.last_review_at AT TIME ZONE v_timezone)::date = v_today_date)
    AND lw.srs_state <> 'learned'
    AND (p_category IS NULL OR dv.category = p_category);

  SELECT COUNT(*) INTO v_learned_today
  FROM public.learned_words lw
  JOIN public.default_vocabulary dv ON dv.word_id = lw.word_id
  WHERE lw.user_unique_key = p_user_key
    AND lw.srs_state = 'learned'
    AND COALESCE(lw.mark_learned_at, (lw.last_review_at AT TIME ZONE v_timezone)::date) = v_today_date
    AND (p_category IS NULL OR dv.category = p_category);

  v_target := GREATEST(v_effective_count - v_active - v_learned_today, 0);

  IF v_target > 0 THEN
    -- Step 2: new day, clear yesterday's flags (as the live function does)
    UPDATE public.learned_words lw
    SET is_today_selection = false,
        due_selected_today = false
    WHERE lw.user_unique_key = p_user_key
      AND ((lw.last_review_at AT TIME ZONE v_timezone)::date <> v_today_date)
      AND (COALESCE(lw.is_today_selection, false) OR COALESCE(lw.due_selected_today, false));

    -- Step 3: DUE FIRST. Most overdue first, up to v_target, no category quotas.
    WITH due_words AS (
      SELECT lw2.word_id
      FROM public.learned_words AS lw2
      JOIN public.default_vocabulary AS dv2 ON dv2.word_id = lw2.word_id
      WHERE lw2.user_unique_key = p_user_key
        AND lw2.srs_state <> 'learned'
        AND COALESCE(lw2.is_today_selection, false) = false
        AND ((lw2.next_review_at AT TIME ZONE v_timezone)::date <= v_today_date)
        AND (p_category IS NULL OR dv2.category = p_category)
      ORDER BY lw2.next_review_at ASC NULLS FIRST
      LIMIT v_target
    )
    UPDATE public.learned_words AS lw
    SET last_review_at    = timezone(v_timezone, now()),
        review_count      = COALESCE(lw.review_count, 0) + 1,
        srs_interval_days = CASE
                              WHEN lw.review_count IS NULL OR lw.review_count = 0 THEN 1
                              ELSE CEIL(COALESCE(lw.srs_interval_days, 1) * COALESCE(lw.srs_ease, 2.5))
                            END,
        next_review_at    = timezone(v_timezone, now()) + (
                              CASE
                                WHEN lw.review_count IS NULL OR lw.review_count = 0 THEN interval '1 day'
                                ELSE (CEIL(COALESCE(lw.srs_interval_days, 1) * COALESCE(lw.srs_ease, 2.5)) || ' days')::interval
                              END
                            ),
        updated_at        = timezone(v_timezone, now()),
        is_today_selection = true,
        due_selected_today = true
    WHERE lw.user_unique_key = p_user_key
      AND lw.word_id IN (SELECT dw.word_id FROM due_words AS dw);

    GET DIAGNOSTICS v_due_picked = ROW_COUNT;   -- what was ACTUALLY picked, not the planned cap

    -- Step 4: NEW words fill EVERY remaining slot (leftover due slots included).
    v_new_needed := GREATEST(v_target - v_due_picked, 0);

    IF v_new_needed > 0 THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.learned_words lw
        JOIN public.default_vocabulary dv ON dv.word_id = lw.word_id
        WHERE lw.user_unique_key = p_user_key
          AND COALESCE(lw.is_today_selection, false) = true
          AND ((lw.last_review_at AT TIME ZONE v_timezone)::date = v_today_date)
          AND dv.category IN ('word formation', 'phrases, collocations')
      ) INTO v_has_special_today;

      INSERT INTO public.learned_words (
        user_unique_key, word_id, category,
        learned_at, review_count, srs_state,
        last_review_at, next_review_at, srs_interval_days, srs_ease, updated_at,
        is_today_selection, due_selected_today
      )
      SELECT
        p_user_key,
        c.word_id,
        c.category,
        timezone(v_timezone, now()),
        1,
        'learning',
        timezone(v_timezone, now()),
        timezone(v_timezone, now()) + interval '1 day',
        1,
        CASE WHEN c.category IN ('word formation', 'phrases, collocations') THEN 1.8 ELSE 2.5 END,
        timezone(v_timezone, now()),
        true,
        false
      FROM (
        SELECT
          dv.word_id,
          dv.category,
          md5(dv.word_id || '-' || v_today_date::text || '-' || p_user_key) AS h,
          ROW_NUMBER() OVER (
            PARTITION BY dv.category
            ORDER BY md5(dv.word_id || '-' || v_today_date::text || '-' || p_user_key)
          ) AS rn_cat,
          ROW_NUMBER() OVER (
            PARTITION BY (dv.category IN ('word formation', 'phrases, collocations'))
            ORDER BY md5(dv.word_id || '-' || v_today_date::text || '-' || p_user_key)
          ) AS rn_special
        FROM public.default_vocabulary dv
        LEFT JOIN public.learned_words lw
          ON lw.user_unique_key = p_user_key AND lw.word_id = dv.word_id
        WHERE lw.word_id IS NULL
          AND (p_category IS NULL OR dv.category = p_category)
      ) c
      WHERE
        -- keep "at most one word formation / phrases, collocations word per day", but only for the all-groups
        -- selection (with a single group it would cap the whole day at 1 word)
        p_category IS NOT NULL
        OR c.category NOT IN ('word formation', 'phrases, collocations')
        OR (NOT v_has_special_today AND c.rn_special = 1)
      ORDER BY c.rn_cat, c.h          -- round-robin over categories; a category that runs out just stops contributing
      LIMIT v_new_needed
      ON CONFLICT ON CONSTRAINT learned_words_user_word_unique DO NOTHING;
    END IF;
  END IF;

  -- Step 5: progress summary (computed on every call; the live early return left these NULL)
  SELECT
    COUNT(*) FILTER (WHERE lw.srs_state = 'learning'),
    COUNT(*) FILTER (WHERE lw.srs_state = 'learned'),
    COUNT(*) FILTER (WHERE lw.srs_state = 'learning'
                       AND (lw.next_review_at AT TIME ZONE v_timezone) <= timezone(v_timezone, now())),
    (SELECT COUNT(*) FROM public.default_vocabulary) - COUNT(*),
    ARRAY(
      SELECT DISTINCT to_char((lw2.last_review_at AT TIME ZONE v_timezone)::date, 'YYYY-MM-DD')
      FROM public.learned_words lw2
      WHERE lw2.user_unique_key = p_user_key
        AND lw2.last_review_at IS NOT NULL
      ORDER BY 1
    )
  INTO v_learning_count, v_learned_count, v_learning_due_count, v_remaining_count, v_learned_days
  FROM public.learned_words lw
  WHERE lw.user_unique_key = p_user_key;

  IF v_target > 0 THEN
    SELECT
      COUNT(DISTINCT (lw.learned_at AT TIME ZONE v_timezone)::date),
      COUNT(DISTINCT lw.word_id)
    INTO v_days_learned, v_learning_words_total
    FROM public.learned_words lw
    WHERE lw.user_unique_key = p_user_key
      AND lw.learned_at IS NOT NULL;

    UPDATE public.nicknames n
    SET days_learned         = v_days_learned,
        learning_words_count = v_learning_words_total
    WHERE n.user_unique_key = p_user_key;
  END IF;

  -- Step 6: return today's selection + words marked learned TODAY. No prior-day learned rows.
  RETURN QUERY
  WITH
  today_rows AS (
    SELECT
      dv.word_id AS word_id, dv.category AS category, dv.word AS word, dv.meaning AS meaning,
      dv.example AS example, dv.translation AS translation,
      lw.learned_at AS learned_at, lw.review_count AS review_count, lw.last_review_at AS last_review_at,
      lw.next_review_at AS next_review_at, lw.srs_interval_days AS srs_interval_days, lw.srs_ease AS srs_ease,
      lw.srs_state AS srs_state, lw.user_unique_key AS user_unique_key, lw.mark_learned_at AS mark_learned_at,
      lw.updated_at AS updated_at, lw.is_today_selection AS is_today_selection, lw.due_selected_today AS due_selected_today,
      v_learning_count AS learning_count, v_learned_count AS learned_count,
      v_learning_due_count AS learning_due_count, v_remaining_count AS remaining_count, v_learned_days AS v_learned_days
    FROM public.learned_words AS lw
    JOIN public.default_vocabulary AS dv ON dv.word_id = lw.word_id
    WHERE lw.user_unique_key = p_user_key
      AND COALESCE(lw.is_today_selection, false) = true
      AND ((lw.last_review_at AT TIME ZONE v_timezone)::date = v_today_date)
      AND (p_category IS NULL OR dv.category = p_category)
  ),
  learned_today_rows AS (
    SELECT
      dv.word_id AS word_id, dv.category AS category, dv.word AS word, dv.meaning AS meaning,
      dv.example AS example, dv.translation AS translation,
      lw.learned_at AS learned_at, lw.review_count AS review_count, lw.last_review_at AS last_review_at,
      lw.next_review_at AS next_review_at, lw.srs_interval_days AS srs_interval_days, lw.srs_ease AS srs_ease,
      lw.srs_state AS srs_state, lw.user_unique_key AS user_unique_key, lw.mark_learned_at AS mark_learned_at,
      lw.updated_at AS updated_at, true AS is_today_selection, false AS due_selected_today,
      v_learning_count AS learning_count, v_learned_count AS learned_count,
      v_learning_due_count AS learning_due_count, v_remaining_count AS remaining_count, v_learned_days AS v_learned_days
    FROM public.learned_words AS lw
    JOIN public.default_vocabulary AS dv ON dv.word_id = lw.word_id
    WHERE lw.user_unique_key = p_user_key
      AND lw.srs_state = 'learned'
      AND COALESCE(lw.mark_learned_at, (lw.last_review_at AT TIME ZONE v_timezone)::date) = v_today_date
      AND (p_category IS NULL OR dv.category = p_category)
  ),
  combined AS (
    SELECT * FROM today_rows
    UNION ALL
    SELECT * FROM learned_today_rows
  ),
  ranked AS (
    SELECT c.*,
           ROW_NUMBER() OVER (
             PARTITION BY c.word_id
             ORDER BY c.is_today_selection DESC, c.due_selected_today DESC, c.updated_at DESC, c.learned_at DESC NULLS LAST
           ) AS rn
    FROM combined AS c
  )
  SELECT
    r.word_id, r.category, r.word, r.meaning, r.example, r.translation,
    r.learned_at, r.review_count, r.last_review_at, r.next_review_at,
    r.srs_interval_days, r.srs_ease, r.srs_state, r.user_unique_key,
    r.mark_learned_at, r.updated_at, r.is_today_selection, r.due_selected_today,
    r.learning_count, r.learned_count, r.learning_due_count, r.remaining_count, r.v_learned_days
  FROM ranked AS r
  WHERE r.rn = 1
  ORDER BY
    (r.srs_state = 'learned') ASC,            -- active words first, learned-today last
    r.due_selected_today DESC,
    r.last_review_at DESC NULLS LAST,
    r.word_id;
END;
$function$;

-- Post-check on staging (do not skip): for a user with due words and a mixed history call
--   select count(*) filter (where srs_state <> 'learned') as active,
--          count(*) filter (where srs_state = 'learned')  as learned_today
--   from public.generate_daily_selection_v2('<test-user-key>', 20, null);
-- expect active + learned_today = 20 (or fewer ONLY when due + never-seen words are exhausted), and no row with a
-- mark_learned_at before today.

-- COMMIT only after the post-check; otherwise ROLLBACK.
ROLLBACK;
