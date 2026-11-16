-- =====================================================================================
-- 2026-11-16  default_vocabulary_base cleanup
--
-- *** NOT APPLIED. Review, then run manually in the Supabase SQL editor (or psql -f). ***
--
-- How to run: execute each BEGIN..COMMIT block on its own. Read the pre-check output
-- first and compare it with the expected numbers in the comments; if they differ,
-- run ROLLBACK instead of COMMIT. Section A and B are idempotent (re-running is a no-op).
-- The local copy of this cleanup is src/data/defaultVocabulary.json (same commit series).
--
-- Contents:
--   A. Rewrite 5 example sentences (originals were quotations).
--   B. Delete 2 IELTS study-note rows (+ their learned_words rows) and refresh summaries.
--   (C and D are appended by later commits: category normalisation, "total _words".)
-- =====================================================================================

-- ------------------------------------------------------------------------------------
-- A. Example rewrites
-- ------------------------------------------------------------------------------------
BEGIN;

-- Pre-check: expect 5 rows.
SELECT word, category, meaning, example
FROM public.default_vocabulary_base
WHERE word IN (
  'for the time being',
  'lock up /lɒk ʌp/ 2',          -- meaning: "to imprison someone"
  'not have a leg to stand on',
  'not see the wood for the trees',
  'Slogan (noun)'
);

UPDATE public.default_vocabulary_base SET example = $q$My laptop is being repaired, so I'm using my sister's old one for the time being.$q$
 WHERE word = 'for the time being';
UPDATE public.default_vocabulary_base SET example = $q$After the trial, the judge decided to lock him up for five years.$q$
 WHERE word = 'lock up /lɒk ʌp/ 2' AND meaning = 'to imprison someone';
UPDATE public.default_vocabulary_base SET example = $q$Without the receipt, she didn't have a leg to stand on when she asked for a refund.$q$
 WHERE word = 'not have a leg to stand on';
UPDATE public.default_vocabulary_base SET example = $q$He spent hours fixing the fonts on his slides and couldn't see the wood for the trees – the main argument was still missing.$q$
 WHERE word = 'not see the wood for the trees';
UPDATE public.default_vocabulary_base SET example = $q$The charity's new slogan was short, catchy and easy to remember.$q$
 WHERE word = 'Slogan (noun)';

COMMIT;  -- or ROLLBACK;

-- ------------------------------------------------------------------------------------
-- B. Delete the 2 IELTS study-note rows
-- ------------------------------------------------------------------------------------
BEGIN;

-- Pre-check. Expected (export of 2026-11): 2 vocabulary rows, 6 learned_words rows
-- (4 for the first key + 2 for the second), 6 distinct users at most.
SELECT
  (SELECT count(*) FROM public.default_vocabulary_base
    WHERE word LIKE 'In order to achieve a very high band in the IELTS speaking test%'
       OR word LIKE 'some ‘less common’ vocabulary, including idioms and less common collocations.%') AS vocab_rows,
  (SELECT count(*) FROM public.learned_words
    WHERE word_id LIKE 'In order to achieve a very high band in the IELTS speaking test%'
       OR word_id LIKE 'some ‘less common’ vocabulary, including idioms and less common collocations.%') AS learned_rows,
  (SELECT count(DISTINCT user_unique_key) FROM public.learned_words
    WHERE word_id LIKE 'In order to achieve a very high band in the IELTS speaking test%'
       OR word_id LIKE 'some ‘less common’ vocabulary, including idioms and less common collocations.%') AS users;

-- Remember who is affected so their cached summary can be refreshed afterwards.
CREATE TEMP TABLE _ielts_affected_users ON COMMIT DROP AS
SELECT DISTINCT user_unique_key
FROM public.learned_words
WHERE word_id LIKE 'In order to achieve a very high band in the IELTS speaking test%'
   OR word_id LIKE 'some ‘less common’ vocabulary, including idioms and less common collocations.%';

-- learned_words.word_id is an FK to default_vocabulary_base.word: children first.
DELETE FROM public.learned_words
WHERE word_id LIKE 'In order to achieve a very high band in the IELTS speaking test%'
   OR word_id LIKE 'some ‘less common’ vocabulary, including idioms and less common collocations.%';

DELETE FROM public.default_vocabulary_base
WHERE word LIKE 'In order to achieve a very high band in the IELTS speaking test%'
   OR word LIKE 'some ‘less common’ vocabulary, including idioms and less common collocations.%';

-- refresh_user_progress_summary(p_user_key text) is per user: loop over the affected ones.
DO $$
DECLARE u text;
BEGIN
  FOR u IN SELECT user_unique_key FROM _ielts_affected_users LOOP
    PERFORM public.refresh_user_progress_summary(u);
  END LOOP;
END $$;

COMMIT;  -- or ROLLBACK;
