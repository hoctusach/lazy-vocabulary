-- 2026-11-16 move the "write down" sense from 'take in' to 'take down'
-- Purpose: the row 'take in /teɪk ɪn/' with meaning "to write down information or statements"
--   really belongs to the phrasal verb 'take down'. Re-key it to 'take down /teɪk daʊn/ 2'
--   (server convention for a 2nd sense; 'take down /teɪk daʊn/' already holds the dismantle sense),
--   replace its example, and repoint public.learned_words (FK has no ON UPDATE CASCADE).
-- Approved by user 2026-11-16. Mirrors the change in src/data/defaultVocabulary.json.
-- Run AFTER 2026-11-16-phrasal-examples.sql.
-- STATUS: NOT APPLIED. Run manually (Supabase SQL editor) after review.
-- Roll back: see commented block at the bottom (run in its own transaction).

BEGIN;

CREATE TABLE IF NOT EXISTS public.default_vocabulary_base_bak_20261116_takedown AS
SELECT * FROM public.default_vocabulary_base
WHERE word = $q$take in /teɪk ɪn/$q$;

CREATE TABLE IF NOT EXISTS public.learned_words_bak_20261116_takedown AS
SELECT * FROM public.learned_words
WHERE word_id = $q$take in /teɪk ɪn/$q$;

-- Pre-checks: expect 1, 0, n
SELECT count(*) AS old_row_exists FROM public.default_vocabulary_base WHERE word = $q$take in /teɪk ɪn/$q$;
SELECT count(*) AS new_key_absent FROM public.default_vocabulary_base WHERE word = $q$take down /teɪk daʊn/ 2$q$;
SELECT count(*) AS learned_on_old_key FROM public.learned_words WHERE word_id = $q$take in /teɪk ɪn/$q$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.default_vocabulary_base WHERE word = $q$take in /teɪk ɪn/$q$) THEN
    RAISE EXCEPTION 'old row "take in /teɪk ɪn/" is missing';
  END IF;
  IF EXISTS (SELECT 1 FROM public.default_vocabulary_base WHERE word = $q$take down /teɪk daʊn/ 2$q$) THEN
    RAISE EXCEPTION 'new key "take down /teɪk daʊn/ 2" already present';
  END IF;
END $$;

INSERT INTO public.default_vocabulary_base (word, category, meaning, example, translation)
SELECT $q$take down /teɪk daʊn/ 2$q$, category, meaning,
       $q$During the call, Priya took down the client's exact wording so nothing would be misquoted later.$q$,
       translation
FROM public.default_vocabulary_base
WHERE word = $q$take in /teɪk ɪn/$q$;

UPDATE public.learned_words
SET word_id = $q$take down /teɪk daʊn/ 2$q$
WHERE word_id = $q$take in /teɪk ɪn/$q$;

DELETE FROM public.default_vocabulary_base WHERE word = $q$take in /teɪk ɪn/$q$;

-- Post-checks: expect 1 row, 0, equal counts, 0
SELECT * FROM public.default_vocabulary_base WHERE word = $q$take down /teɪk daʊn/ 2$q$;
SELECT count(*) AS old_absent FROM public.default_vocabulary_base WHERE word = $q$take in /teɪk ɪn/$q$;
SELECT (SELECT count(*) FROM public.learned_words WHERE word_id = $q$take down /teɪk daʊn/ 2$q$) AS learned_on_new_key,
       (SELECT count(*) FROM public.learned_words_bak_20261116_takedown) AS backup_count;
SELECT count(*) AS learned_left_on_old_key FROM public.learned_words WHERE word_id = $q$take in /teɪk ɪn/$q$;

COMMIT;

-- ROLLBACK (run separately, in its own transaction):
-- BEGIN;
-- INSERT INTO public.default_vocabulary_base
--   SELECT * FROM public.default_vocabulary_base_bak_20261116_takedown;
-- UPDATE public.learned_words SET word_id = $q$take in /teɪk ɪn/$q$
--   WHERE word_id = $q$take down /teɪk daʊn/ 2$q$
--     AND user_unique_key IN (SELECT user_unique_key FROM public.learned_words_bak_20261116_takedown);
-- DELETE FROM public.default_vocabulary_base WHERE word = $q$take down /teɪk daʊn/ 2$q$;
-- COMMIT;
