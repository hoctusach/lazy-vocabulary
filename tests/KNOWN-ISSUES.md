# Known issues and proposed solutions

Each issue below has a test marked `it.fails` in `tests/` (or a normal test that documents today's behaviour).
`it.fails` passes while the bug exists and **starts failing when the bug is fixed**: then change `it.fails` to `it`.

Priority: **P1** security or wrong data for real users, **P2** wrong behaviour in some cases, **P3** polish / needs a decision.

| # | Priority | Issue | Where it is tested |
| ---: | :---: | --- | --- |
| 1 | P1 | Streak and "learned today" are wrong in time zones east of UTC (Vietnam) | `streakTimezone.test.ts` |
| 2 | P2 | Nickname that passes validation is changed or emptied by sanitizing | `nicknameRules.test.ts`, `AuthGate.test.tsx` |
| 3 | P1 | Passcodes differing only by leading zeros are the same passcode | `edgeFunctions.test.ts` |
| 4 | P1 | Look-alike nicknames with zero-width characters become separate accounts | `nicknameRules.test.ts`, `edgeFunctions.test.ts` |
| 5 | P1 | No limit on wrong passcode attempts | not testable yet (needs the feature) |
| 6 | P2 | `TOTAL_WORDS` (3261) differs from the data (3263) | `defaultDataIntegrity.test.ts` |
| 7 | P2 | 193 repeated word + category pairs in the built-in data | `defaultDataIntegrity.test.ts` |
| 8 | P2 | Import limits cut text that the built-in data already exceeds | `defaultDataIntegrity.test.ts`, `importEdge.test.ts` |
| 9 | P3 | Dialog says "100 days", code uses 60 days | `srsScheduling.test.ts` |
| 10 | P3 | Daily size always uses the maximum of the range | `srsScheduling.test.ts` |
| 11 | P3 | `new` counter ignores learned words | `learnedWordStatsEdge.test.ts` |
| 12 | P2 | Search drops non-Latin text; `limit = 0` returns one result | `searchEdge.test.ts` |
| 13 | P3 | Learning time can add negative time; uses the UTC day | `storageHelpers.test.ts` |
| 14 | P2 | Old SQL file in the repo does not match the live database | (SQL tests use the live definitions) |
| 15 | P2 | Status of a word in the middle of its schedule is `new` | `srsScheduling.test.ts` |
| 16 | P2 | SQL-pattern sanitizer damages normal English ("update ... set", "exec") | `securityEdge.test.ts` |

---

## 1. Streak and "learned today" in UTC+ time zones (P1)
**Cause.** `streak.ts` builds the day with `setHours(0,0,0,0)` and then `toISOString()`. Local midnight in Vietnam is 17:00 UTC of the day before, so "today" becomes yesterday. The same pattern is in `quizService.ts` and `useDailyReminder.ts`.
**Fix.** Use one helper that returns the local date (`getLocalDateISO` already exists in `utils/date.ts`) in `streak.ts`, `quizService.ts`, `useDailyReminder.ts` and `learningTimeService.ts`. Walk back day by day with local dates.
**Check first.** What does the server put in `learned_days`: the user's local date or the UTC date? It must be the user's local date (the app stores the user's timezone in `nicknames.timezone`). If it is UTC, convert on the server with that timezone.
**After.** Change the three `it.fails` in `streakTimezone.test.ts` to `it`.

## 2. Nickname validation vs sanitizing (P2)
**Cause.** `validateDisplayName` blocks `< > " ' ` $ \ { } | ;` but `sanitizeNickname` removes `< > " ' ` $ ( ) { } [ ] ;`. So `(((` passes and becomes empty, and `Mi (mi)` silently becomes `Mi mi`.
**Fix.** One list of forbidden characters used by both functions (`lib/nickname.ts`). Do not alter the name silently: if the name contains a forbidden character, show the error and let the user fix it. Show the same list in the help text under the field.
**After.** Change `it.fails` in `nicknameRules.test.ts` to `it`; update the "removes ( ) [ ]" test in `AuthGate.test.tsx`.

## 3. Passcode leading zeros (P1)
**Cause.** The Edge Function does `Number(passcode)` and the column is `bigint`, so `0123` and `00123` are both 123 (and the stored passcode loses its zeros).
**Fix (best).** Store the passcode as text and compare text. The live `verify_nickname_passcode` already compares `::text`. Migration: `alter table public.nicknames alter column passcode type text using passcode::text;`, then pass the string through the Edge Functions and `upsert_or_verify_profile` (`p_passcode text`). Existing passcodes that lost zeros keep working only if the user types them without the zeros, so tell users or keep a short grace period.
**Better still.** Do not store the passcode in clear text: store a hash (`pgcrypto`: `crypt(passcode, gen_salt('bf'))`) and verify with `crypt`.
**Quick alternative.** Reject passcodes that start with `0` on the client and in both Edge Functions.

## 4. Zero-width characters in nicknames (P1)
**Cause.** The key is built with `.replace(/\s+/g, '')`; zero-width space, word joiner and BOM are not `\s`.
**Fix.** In `canonNickname` (both Edge Functions) and `toCanonical` (client): `.normalize('NFKC').toLowerCase().replace(/[\s\p{Cf}]/gu, '')`, and make validation reject control and format characters (`\p{C}`).
**Before deploying.** Query for existing nicknames that would collide after the change, and decide how to merge or rename them.

## 5. Limit on wrong passcode attempts (P1)
**Cause.** Anyone can try passcodes without limit; a 4-digit passcode has 10,000 possibilities.
**Fix.** In `nickname-passcode-exchange`: table `login_attempts(user_unique_key, failed_count, window_start, locked_until)`. After 5 failed attempts in 15 minutes, answer `429` with `Retry-After` and code `TOO_MANY_ATTEMPTS`; reset on success. The sign-in screen shows "Too many attempts, try again in N minutes". Also raise the minimum passcode length to 6 for new profiles.
**Test.** Add to `edgeFunctions.test.ts` (6th wrong attempt gives 429; right passcode during lock is also refused; lock expires).

## 6. `TOTAL_WORDS` (P2)
**Cause.** Hard-coded 3261, data has 3263.
**Fix.** Compute it: `Object.values(DEFAULT_VOCABULARY_DATA).flat().length`, so it can not drift again. If you deduplicate the data (item 7) it follows automatically. Keep the server table in step (item 7 below).

## 7. Repeated word + category in the built-in data (P2)
**Cause.** 193 pairs appear twice, so they share one `word::category` progress id: marking one as learned also hides the other.
**Fix.** Script that merges duplicates, keeping the entry with the longest meaning/example, run once on `defaultVocabulary.json` and on the Supabase vocabulary table. Add a unit test (it is already there) so the file can not get new duplicates. Then update `TOTAL_WORDS` (item 6).

## 8. Import limits (P2)
**Cause.** Limits are 100 / 500 / 1000 / 500 characters; the built-in data has 176 / 933 / 1257 / 432.
**Fix.** Raise the limits to cover the built-in data (word 200, meaning 1000, example 1500, translation 500) and, more important, **tell the user** when text was shortened: add a warning "N fields were shortened" to the import result instead of cutting silently. Use one shared constant for the importer and for the manual add-word form.

## 9. "100 days" vs 60 days (P3)
**Cause.** `MarkAsLearnedDialog` text says 100 days; `MASTER_INTERVAL_DAYS` is 60.
**Fix.** First find out what the server does (`mark_word_learned_by_key`): the server decides. Then build the dialog text from the constant (`${MASTER_INTERVAL_DAYS} days`) so text and behaviour can not differ.

## 10. Daily size (P3)
**Cause.** `getDailyCount` returns `config.max`; `min` is never used.
**Fix.** Decide the rule: (a) always the maximum, then remove `min` from the config so nobody expects it; or (b) use `min` when the learner has many due reviews (for example `max(min, max - due)`). If the product number is "20 words a day", set it in one place and use it for both the Default set (server call) and custom sets (`DAILY_CAP`). The server function `generate_daily_selection_v2` may also cap the number, check its definition.

## 11. `new` counter (P3)
**Cause.** `new = total - learning` but `remaining = total - learned - learning`.
**Fix.** Decide what "new" means in the UI. If it means "never seen", use `Math.max(total - learned - learning, 0)` (same as `remaining`). Update the test `documents how "new" is counted`.

## 12. Search (P2)
**Cause.** `normalizeQuery` keeps only `[a-zA-Z0-9\s'-]`; `searchVocabulary` pushes the exact match back even with `limit = 0`.
**Fix.** Keep letters and digits of any script: `.replace(/[^\p{L}\p{N}\s'-]/gu, '')`, and strip only combining marks that follow Latin letters (map `đ` to `d` explicitly). In `searchVocabulary` start with `if (limit <= 0) return []`.
**After.** Change both `it.fails` in `searchEdge.test.ts` to `it`.

## 13. Learning time (P3)
**Fix.** `Math.max(0, Date.now() - start)`, and book the day with the local date, not `toISOString()`. For long sessions use `performance.now()` (monotonic) for the duration.

## 14. Stale SQL file (P2)
**Fix.** Replace `supabase/sql/2025-05-nickname-passcode.sql` with a snapshot of the live definitions (the ones used as fixtures in `tests/nicknameAuthSql.test.ts`, once PR #690 is merged) so the repo can recreate the database, and delete the `normalize_nickname`-based functions that do not exist in production. Add `select pg_get_functiondef(...)` snapshots for the other RPC functions (`generate_daily_selection_v2`, `mark_word_learned_by_key`, ...) which are not in the repo at all.

## 15. Status of a word in the middle of its schedule (P2)
**Cause.** `toLearningProgress` passes `isLearnedState(srs)` to `determineStatus`; that is false for words still in the review queue, so they get `new`.
**Fix.** A word with `review_count > 0` is "learning": pass `reviewCount > 0` as the learned flag (or add a `learning` status). First check where `LearningProgress.status` is shown or used (search for `.status`), then update `srsScheduling.test.ts`.

## 16. SQL-pattern sanitizer (P2)
**Cause.** `SQL_INJECTION_PATTERNS` removes text by regex: `UPDATE ... SET` matches "update your profile and set a goal"; `EXEC` alone is removed.
**Fix.** Remove the SQL patterns from user-content sanitizing. The app uses parameterized calls (`supabase.rpc`), so cleaning SQL words gives a false sense of safety and damages text. Keep XSS handling (React already escapes text; keep the HTML-tag removal for safety). If a pattern is kept, make it match only real attack shapes (for example `'\s*or\s+1=1`).
