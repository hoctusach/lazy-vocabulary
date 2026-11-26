# Test case catalog

Written from reading the source (not from the existing tests). Every function and screen that has logic is listed with its edge cases.

**Level:** U = unit, C = component (jsdom), S = SQL/server (PGlite or Supabase), E = e2e on a phone (Maestro), M = manual only.
**Now:** ✔ already covered by a test in `tests/`, ◐ partly covered, ✗ not covered. A `⚠` means reading the code (or a quick probe run) suggests a **bug or a risk to confirm**, see "Suspected issues" at the end.

---

## A. Login and profile (`AuthGate`, `lib/nickname`, `services/nicknameService`, `lib/edgeApi`, Edge Functions, SQL)
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| A1 | Nickname shorter than 3 / longer than 40 | Error message, no request sent | U | ◐ |
| A2 | Nickname with blocked characters `< > " ' ` $ \ { } \| ;` | "blocked characters" error | U | ✔ |
| A3 | Nickname made only of `(` `)` `[` `]` (e.g. `(((`) ⚠ | Rejected with a message (today it passes validation and is sanitized to an empty string) | U | ✗ |
| A4 | Nickname with spaces, emoji, Vietnamese, CJK, RTL text | Accepted; same canonical key on client and server | U | ◐ |
| A5 | Canonical key: `Mi mi U`, `MIMIU`, `mimiu`, full-width letters (NFKC) | Same `user_unique_key` | U | ✔ |
| A6 | Nickname with zero-width space / non-breaking space ⚠ | Treated like normal spaces, or rejected, not a look-alike second account | U/S | ✗ |
| A7 | Passcode: 3 digits, 11 digits, letters, empty, spaces | Error "4-10 digits", no request | U | ✗ |
| A8 | Passcode with leading zeros (`0123` vs `00123`) ⚠ | Different passcodes stay different (today both become 123) | S | ✗ |
| A9 | Sign in with existing nickname, right passcode | Signed in, session saved, page reloads, today's words prepared | C/E | ✗ |
| A10 | Sign in, wrong passcode | "Incorrect passcode. Try again.", passcode field cleared and focused, no session | C/E | ◐ (SQL ✔) |
| A11 | Sign in, nickname does not exist | Switches to "Create your profile" with the typed values and an info message | C/E | ✗ |
| A12 | Create profile, new nickname | Profile created, then signed in automatically | C/E | ✗ |
| A13 | Create profile with an existing nickname and a different passcode | Refused: "That nickname is already taken"; old passcode unchanged | S/E | ✔ (SQL) |
| A14 | Create profile with an existing nickname and the same passcode | Acts like sign-in; no duplicate row | S | ✔ |
| A15 | Legacy profile without a passcode | First caller sets the passcode; second caller with another passcode refused | S | ✔ |
| A16 | Double tap on Sign in / Create while pending | Only one request | C | ✗ |
| A17 | Network down / timeout / 500 during sign in | Error message, form re-enabled, nothing stored | C | ◐ |
| A18 | Edge API returns non-JSON body or empty body | Error shows `HTTP <status>`, no crash | U | ◐ |
| A19 | Edge function: invalid JSON, wrong method, missing nickname, invalid timezone | 400 / 405 with the right `code` | S | ✗ |
| A20 | Timezone sent on create (valid IANA, invalid, missing) | Valid saved; invalid → 400 `INVALID_TIMEZONE`; missing keeps the old one | S | ◐ |
| A21 | Session token: 24 h expiry, `user_sessions` row created / replaced | `expires_at` = now + 24 h | S | ✗ |
| A22 | Many wrong passcodes in a row ⚠ | Should be rate limited (today unlimited) | S | ✗ |
| A23 | Auth functions called directly with the public (anon) key | Permission denied | S | ✔ |
| A24 | Sign out / clear auth, then sign in as a different nickname | No data from the previous user is shown | C/E | ✗ |
| A25 | App reopened with a valid stored session | No login screen | E | ✔ (E2E #1) |
| A26 | New device / cleared data | Login screen shown; wrong then right passcode flow | E | E #34 |

## B. Session and local auth state (`lib/auth.ts`)
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| B1 | Stored auth payload: missing, corrupt JSON, old storage version, legacy key | Treated as signed out; no crash; legacy migrated | U | ✗ |
| B2 | Edge session expiring within 30 s skew | Treated as expired | U | ✗ |
| B3 | Stored nickname differs from session nickname (case/space) | Matches by canonical form | U | ✗ |
| B4 | `clearStoredAuth` with and without `keepPasscode` | Passcode kept / removed as asked | U | ✗ |
| B5 | `normalizePasscode`: whitespace, non-numeric | Trimmed, numeric value | U | ✗ |
| B6 | localStorage unavailable / full / throws | All functions return safe defaults | U | ✗ |
| B7 | Two tabs: sign out in one | Other tab shows login (storage event) | C | ✗ |

## C. Daily words and spaced repetition (`learningProgressService`, `utils/todayWords`, `hooks/useLearningProgress`)
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| C1 | Review count 1…10 → next review date | 1, 2, 3, 5, 7, 10, 14, 21, 28, 35 days | U | ✗ |
| C2 | Review count 11 and above | Learned, master interval 60 days ⚠ (the dialog says 100 days) | U | ✗ |
| C3 | `determineStatus`: new / not due / due / learned, empty next-review date | Correct status for each | U | ✗ |
| C4 | `isDue` with invalid, missing, past, future, exactly-now timestamps | false for invalid/missing; true for ≤ now | U | ✗ |
| C5 | `isLearnedState`: `in_review_queue=false`, review count ≥ 11, state "Learned" (any case) | true | U | ✗ |
| C6 | `computeIntervalDays` negative, invalid dates, same day | Clamped to ≥ 0 / null | U | ✗ |
| C7 | `toIsoDate`: date only, full ISO, junk, empty | ISO or null | U | ✗ |
| C8 | Daily size by intensity (light / moderate / intense) ⚠ | Uses the configured size (today always the max) | U | ✗ |
| C9 | First open of the day | New selection fetched, cached with today's date | C | ✗ |
| C10 | Reopen later the same day | Cached list reused, no server call | C | ◐ |
| C11 | Day changes while the app is open (midnight) | Next launch/refresh builds a new list; no stale list | C | ✗ |
| C12 | Timezone of the user differs from the device (travel) | "Today" follows the stored user timezone | U | ✗ |
| C13 | Server returns fewer words than requested / none / error | App still usable (local slice) with a visible notice | C | ✗ |
| C14 | Server returns rows with `is_today_selection=false`, missing `word_id`, unknown words | Skipped, no crash | U | ✗ |
| C15 | Word appears in two categories | Progress kept separately per `word::category` | U | ✔ (set store) |
| C16 | `deriveWordFromId` with `::` inside the word | Correct word and category | U | ✗ |
| C17 | Mark learned | Word leaves today's list, cache updated, counts +1, payload sent | C | ✗ |
| C18 | Mark learned while offline / server error | Local state consistent; message; no duplicate on retry | C | ✗ |
| C19 | Mark learned response missing fields | Previous good lists kept (no empty list) | C | ✗ |
| C20 | Mark as new again | Word returns to learning; counts adjusted | C | ✗ |
| C21 | Learned word reappears after its review interval | Shown in Due list that day | U | ✗ |
| C22 | Change intensity | New selection generated; preference saved; size changes | C | ✗ |
| C23 | `buildTodaysWords`: review words first, new after, de-duplicated, category filter, `nextAllowedTime` ordering | Order and uniqueness | U | ✗ |
| C24 | Two rapid mark-learned taps on the same word | Counted once | C | ✗ |
| C25 | Word with empty category | Category falls back to `general` | U | ✗ |

## D. Progress stats, streak, leaderboard, friend compare
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| D1 | `computeLearnedWordStats`: rows null / empty / mixed state casing | Zero counts, no crash | U | ✔ |
| D2 | New today vs due today split (`is_today_selection`, `due_selected_today` null vs boolean) | Correct lists; falls back to dates | U | ◐ |
| D3 | Counters: learned + learning + remaining = total, never negative; `new` meaning ⚠ | Consistent numbers | U | ◐ |
| D4 | `word_id` forms: `word`, `word::cat`, `cat::word`, extra `::` | Right word/category | U | ✗ |
| D5 | Learned date fallback chain (mark_learned_at → learned_at → last_review_at → next_review_at) | First available | U | ✗ |
| D6 | Streak: none, today only, yesterday only (not yet today), gap, 366+ days | 0, 1, keeps streak until midnight, resets, capped | U | ✔ |
| D7 | Streak and "learned today" in UTC+7 (Vietnam) and UTC-8 ⚠ | Same result as UTC for the same local date (today it is 0 / false in UTC+7) | U | ✗ |
| D8 | Last 7 days strip: ordering, today flag, month boundary, leap day | Oldest first, today marked | U | ✔ |
| D9 | Progress summary: server wins vs local cache; stale cache; both missing | Merge rules | U | ✗ |
| D10 | `mergeProgressSummary`, `setLearningTimeForDay`, `ensureLearnedDay` duplicates | Idempotent | U | ✗ |
| D11 | Leaderboard: timeframes today / week / allTime | Correct filter | U | ◐ |
| D12 | Leaderboard: ties, ranks, limit 5, current user outside top 5, user with no data | Stable order; user row appended | U | ✔ |
| D13 | Leaderboard display name missing / long / HTML | Fallback name; escaped | U | ◐ |
| D14 | Leaderboard fetch fails / empty | Message, no crash | C | ◐ |
| D15 | Friend compare link: `?friend=` empty, invalid, expired, own token | Card hidden or friendly message | C | ✗ |
| D16 | Share link built with and without existing query string | Valid URL | U | ✗ |
| D17 | `getOwnShareToken` not signed in | null, share button disabled | U | ✗ |

## E. Word sets, import, template (`features/word-sets`)
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| E1 | CSV: BOM, `;` and tab delimiters, quoted fields with commas, newlines and `""` | Parsed correctly | U | ✔ |
| E2 | CSV header aliases (`vocabulary`, `definition`, `sentence`…), upper case, extra columns, missing optional columns | Mapped | U | ✔ |
| E3 | Missing `word` or `meaning` column; row with only one of them | Clear error naming the row | U | ✔ |
| E4 | Translation column only (no meaning) | Used as meaning + warning | U | ✔ |
| E5 | Duplicate word in same category | Last copy kept + warning | U | ✔ |
| E6 | More than 4000 words; text over 3.5 M characters | Rejected with message | U | ◐ |
| E7 | Field limits (word 100, meaning 500, example 1000, translation 500, category 40) ⚠ | Truncated (the built-in data is longer: 176 / 933 / 1257) | U | ◐ |
| E8 | Control characters, zero-width characters, emoji, CJK, RTL text | Control removed; text kept | U | ◐ |
| E9 | JSON: array, `{ words: [] }`, `{ category: [] }`, non-object items, invalid JSON | Accepted shapes; clear errors | U | ✔ |
| E10 | Excel: several sheets (sheet = category), empty sheets, `readme`/`notes` sheet, `.xls`, corrupt file | Parsed or clear error | U | ◐ |
| E11 | Unsupported extension, empty file, file name without extension | Message | U | ✔ |
| E12 | Category blank | Sheet name, else `imported` | U | ◐ |
| E13 | Count column: text, negative, huge | Clamped | U | ◐ |
| E14 | Templates (CSV, Excel, JSON) re-import cleanly and list valid categories | 3 words, no errors | U | ✔ |
| E15 | Import creates a set and activates it | Active set changes; set listed | U | ✔ |
| E16 | Import when storage is full (quota) | Error message; no partial set | U | ◐ |
| E17 | Rename: empty, 60 vs 61 characters, default set, unknown id | Validation | U | ✔ |
| E18 | Delete: active set → falls back to Default; progress removed | Correct | U | ✔ |
| E19 | Two sets with the same name | Allowed or refused (decide and test) | U | ✗ |
| E20 | Progress isolated per set; same word in two sets | Independent | U | ✔ |
| E21 | Today queue: due first, then new, capped at 20; restored the same day; new day rebuilds | As described | U | ◐ |
| E22 | Corrupt `lv.vocabularySets.*` JSON | Ignored safely, Default still works | U | ✗ |
| E23 | `markSetWordLearned` intervals (1, 3, 7, 14, 30 days) and `markSetWordNew` | Correct dates | U | ◐ |
| E24 | `recordDisplayedWord` first and repeated | Learning entry created once | U | ✔ |
| E25 | Switching set clears the resume cursor | Starts from the first word | U | ✔ |
| E26 | UI: import error list capped at 8 with "N more hidden" | Message | C | ✗ |

## F. Playback and speech
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| F1 | Speech text = word, meaning, example joined; empty parts skipped; annotations/IPA cleaned | Right text | U | ✔ |
| F2 | Word with only a number/IPA/punctuation, or CJK only (`hasValidSpeechableContent`) | Not spoken, auto-advance continues | U | ◐ |
| F3 | Speech rate: stored, missing, below / above range, NaN | Clamped to range | U | ✔ |
| F4 | Voice: saved voice not installed, no voices, one voice, cycle through voices | Falls back; Change Voice disabled with one | U | ◐ |
| F5 | Last-used voice restored after restart | Same voice and label | U/E | ◐ (E #26) |
| F6 | Mute: stops current speech, no new speech, state kept, unmute resumes next word | As described | U | ✔ |
| F7 | Pause / play: pause immediately; play resumes the same word | As described | U | ◐ |
| F8 | Next during speech / rapid taps (debounce 300 ms) | One advance, old speech cancelled | U | ✔ |
| F9 | Auto-advance after speech ends; last word wraps to the first | Loop | U | ✔ |
| F10 | Speech error `not-allowed` / `interrupted` / `synthesis-failed` / engine missing | Recovers or shows "tap to enable"; no infinite loop | U | ◐ |
| F11 | Audio blocked until first tap (mobile) | Banner; first tap unlocks and starts | C/E | ✗ |
| F12 | Very long text split into chunks and spoken in order | Sequence kept | U | ✗ |
| F13 | App goes to background / screen off | Playback paused (web) or continued (Android service) | M/E | ✗ |
| F14 | Phone call / other audio takes focus | Pauses, resumes after | M | ✗ |
| F15 | Epoch/queue: stop clears queue and timers | No stale callbacks | U | ✔ |
| F16 | Word list empty, one word, list changes while playing | No crash; current word kept if present | U | ✔ |
| F17 | Settings restored on start: muted, paused, voice, rate | Applied once | U | ✔ |

## G. Learn screen UI
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| G1 | Card shows word, meaning, example, category label | All visible; category label for known and custom categories | C/E | E #4 |
| G2 | Word with annotations `word (verb) /ipa/` | Main word big, annotations small | U | ✔ |
| G3 | Very long word / meaning / example (900+ chars) | Wraps, no overflow | E | ✗ |
| G4 | No words available | Empty state text, controls safe | C | ✗ |
| G5 | Translation line (when present) | Shown, multi-line | C | ✗ |
| G6 | Mark as Learned dialog: confirm / cancel / backdrop tap | Word removed only on confirm | C/E | ✗ |
| G7 | Mark as New dialog | Word returns to learning | C | ✗ |
| G8 | Open word detail page `/vocabulary/:word` with spaces, slashes, `%`, non-Latin | Loads the right word or a not-found message | C | ✗ |
| G9 | Unknown route | 404 page with a way back | C | ✗ |
| G10 | Portrait / landscape rotation | State and playback kept | E | ✗ |
| G11 | Tab bar does not cover content (360 px width, large font setting) | Last element reachable | E | E #28 |
| G12 | Dark / light theme persists after restart | Same theme | C/E | E #25 |
| G13 | Bottom tabs: current tab highlighted, state kept when switching | Correct | E | E #2 |

## H. Search (`searchVocabulary`, `normalizeQuery`, `WordSearchModal`)
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| H1 | Exact > prefix > whole-word > all-tokens > fuzzy ranking | In that order | U | ✔ |
| H2 | Tie-break by frequency, then alphabetical | Stable | U | ◐ |
| H3 | Typo within distance 1 (single word) or 2 (multi-word) | Found with low rank | U | ✗ |
| H4 | Empty, spaces only, punctuation only | No results | U | ✔ |
| H5 | Non-Latin query (`你好`) ⚠ | Not silently empty: message or support | U | ✗ |
| H6 | Vietnamese query (`đường`) ⚠ | `đ` handled (today becomes `uong`) | U | ✗ |
| H7 | Limit 0 / 1 / huge; exact match always included in the limited list ⚠ | Respects the limit (today limit 0 returns 1) | U | ✗ |
| H8 | Query with annotations `give up (phr v)` | Annotations ignored | U | ✔ |
| H9 | Search inside an imported set vs Default | Uses the active set; refreshes after set changes | C | ◐ |
| H10 | Modal: type, view word, close, reopen with a prefilled word | State correct | C/E | E #10 |
| H11 | Same word in several categories | All shown, distinguishable | C | ✗ |

## I. Quiz and Practice
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| I1 | Question: 3 distractors, same category preferred, distractors unique ignoring case | As described | U | ✔ |
| I2 | Target without meaning; pool smaller than distractor count; all meanings identical | null or fewer options, no crash | U | ✔ |
| I3 | Quiz of 5 from targets; falls back to pool; no repeated word | As described | U | ✔ |
| I4 | Word of the day deterministic per date, empty pool null | As described | U | ✔ |
| I5 | Word of the day near midnight / different time zones | Document which date is used (today UTC) | U | ✗ |
| I6 | Quiz UI: answer locks, Next disabled until answered, "See results" on last, score, close | As described | C/E | E #13 |
| I7 | Quiz done once per day (localStorage), new day allows again | As described | C | ✗ |
| I8 | Practice metadata: multi-word lemma (`give up` → `give`), `-y` → `-ies/-ied`, `-e` + ing | Forms derived | U | ✗ |
| I9 | Irregular forms (`ran`, `went`) | Documented limitation / accepted | U | ✗ |
| I10 | Evaluate: empty transcript, one word, repeated word, no punctuation, long sentence, apostrophes (`don't`), non-ASCII text | Score and feedback sensible | U | ◐ |
| I11 | Required rule failed caps the score at 69; bonus cannot exceed 100 | As described | U | ◐ |
| I12 | Speech recognition missing / permission denied | User can type the sentence | C | ✗ |
| I13 | Attempts history saved and shown per word; storage full | No crash | U | ✗ |

## J. Reminders, notifications, install prompt
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| J1 | Reminder tiers by streak and learned count (0, 1, 5, 7, 50) | Right message pool | U | ✔ |
| J2 | Max 3 per day, at least 10 minutes apart, state resets on a new day | As described | U | ✗ |
| J3 | Not shown if already learned today | None | U | ✗ |
| J4 | Tab hidden: system notification only if permission granted | As described | U | ✗ |
| J5 | `Notification` unsupported (iOS) / permission denied / default | No crash; toast on return | U | ✗ |
| J6 | Reminder state corrupt JSON | Reset | U | ✗ |
| J7 | NotificationManager: enable, denied message text, already blocked | Correct toasts | C | ✗ |
| J8 | Install prompt: Android event, iOS tip, dismissed once, already installed / native app | Shown only when useful | C | ✗ |

## K. Preferences and local persistence
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| K1 | Preferences: defaults, corrupt JSON, partial object, `null` overriding defaults | Safe defaults | U | ✔ |
| K2 | Legacy keys (`lv_favorite_voice`, `lv_speech_rate`) used then removed after save | Migrated | U | ✔ |
| K3 | Last word per category and "today last word" (date must be today) | Resume at the right word; stale ignored | U | ✗ |
| K4 | Word counts: increment, key by lowercase word + category, corrupt JSON, invalid dates, sort by count then last shown | Right order | U | ✗ |
| K5 | Learning time: start/stop, two starts, stop without start, crossing midnight, clock moved backwards ⚠, UTC vs local day | Never negative; documented day rule | U | ✔ (basic) |
| K6 | Daily usage tracker: tab hidden stops counting, resumes on visible | As described | U | ✔ |
| K7 | Storage keys do not collide between users on one device | Isolated | U | ✗ |
| K8 | Storage quota exceeded on any write | Message, app still works | U | ◐ |

## L. Built-in vocabulary data (`defaultVocabulary.json`)
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| L1 | No empty word / meaning / example | 0 empty (checked: 0) | U | ✗ |
| L2 | Total word count equals `TOTAL_WORDS` ⚠ | Equal (file has 3263, constant is 3261) | U | ✗ |
| L3 | No duplicate word within a category ⚠ | None (193 found), they share one `word::category` id | U | ✗ |
| L4 | Only the 6 known categories | Labels exist for all | U | ✗ |
| L5 | Longest fields fit the display and the import limits ⚠ | Word 176, meaning 933, example 1257 characters exist | U | ✗ |
| L6 | Server vocabulary table equals the bundled file | Same words and ids | S/M | ✗ |

## M. Input safety (`sanitization`, `validation`, `contentFilters`, `DataValidator`)
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| M1 | XSS: `<script>`, `javascript:`, `onerror=`, `<iframe>`, data URLs, comments | Removed | U | ✔ |
| M2 | SQL patterns removed but ordinary words kept (`select`, `update`, `drop`, `union` alone) | Legit meanings not damaged | U | ◐ |
| M3 | IPA, stress marks, Vietnamese, brackets, slashes preserved | Unchanged | U | ✔ |
| M4 | Null bytes and control characters | Removed | U | ✔ |
| M5 | HTML entities: allowed list kept, unknown removed | As coded | U | ✗ |
| M6 | Very long input (100 k characters) | Fast, no regex backtracking hang | U | ✗ |
| M7 | Imported text containing HTML is shown as text | Escaped in the UI | C | ✗ |
| M8 | Validation per field: word, meaning, example (valid, malicious, empty) | Result + sanitized value | U | ✔ |
| M9 | `DataValidator`: total word limit 50,000, missing fields, wrong types | Errors listed | U | ✗ |

## N. Platform, lifecycle, environment
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| N1 | Cold start, kill and relaunch | State restored | E | E #26 |
| N2 | Start offline (Default and imported set) | Imported works; Default shows a clear state | E | E #27 |
| N3 | Go offline mid-session, come back online | Sync catches up without duplicates | M | ✗ |
| N4 | Device language changes (English, Vietnamese, other) | UI text stable; translation shown according to the rules | M | ✗ |
| N5 | Device date/time changed, timezone changed | Today's list and streak stay sane | M | ✗ |
| N6 | Low storage / storage cleared by OS | Falls back to login; no crash | M | ✗ |
| N7 | Different screen sizes (320, 360, 412, 768, tablet), font scale 130–200 % | No clipping | E | ✗ |
| N8 | Back button (Android) from each tab and dialog | Closes dialog / goes to Learn / exits | E | ✗ |
| N9 | Deep link `lazyvocabulary://…` with and without path | Opens the right screen | E | ✗ |
| N10 | Share sheet for templates (native) and download (web) | File saved / shared | E | E #17 |
| N11 | File picker: cancel, huge file, wrong type, file from cloud storage | Message, no crash | E | ✗ |
| N12 | Supabase down or slow, 429, invalid key | Clear message; Default set still reachable locally | C | ✗ |

## O. Android background playback (branch `ccr-d29e12fd-1qdwdo`, pending merge)
| ID | Case | Expected | Lvl | Now |
| --- | --- | --- | --- | --- |
| O1 | Screen off while playing | Keeps reading; notification shown | E/M | E #30–31 |
| O2 | Notification Pause / Play / Next / Stop | Works; app state matches on return | E/M | E #32 |
| O3 | Reopen app | Continues at the word being read | E/M | E #33 |
| O4 | Notification permission denied (Android 13+) | Still plays; no crash | M | ✗ |
| O5 | Muted or paused when going to background | No service started | U | ✔ |
| O6 | Queue builder: wrap-around, cap of 200, empty list, resume index maths | As described | U | ✔ |
| O7 | Swipe the app away; audio focus lost / regained; Bluetooth headset buttons; battery saver | Stops cleanly / pauses / resumes | M | ✗ |
| O8 | Speech engine missing or language data missing in the service | Falls back to en-US; stops cleanly if none | M | ✗ |

---

## Suspected issues found while reading (please confirm)
1. **Streak and "learned today" in UTC+ time zones.** `lib/progress/streak.ts` builds today's key with `setHours(0,0,0,0)` then `toISOString()` (UTC). I ran it: with `TZ=Asia/Ho_Chi_Minh`, learning today gives streak 0 and `hasLearnedToday` false (UTC and Los Angeles are fine). It can also make reminders nag people who already learned. This assumes the server sends learned days as local dates; confirm what the server sends.
2. **Nickname sanitizing vs validation.** `validateDisplayName` allows `(`, `)`, `[`, `]` but `sanitizeNickname` removes them: `(((` passes validation and becomes an empty name (confirmed by running it); `Mi (mi)` silently becomes `Mi mi`.
3. **Passcode leading zeros.** The server turns the passcode into a number, so `0123` and `00123` are the same passcode.
4. **Look-alike nicknames.** The server canonical form only removes `\s`; zero-width characters are not removed, so two visually identical names can be two accounts.
5. **No limit on wrong passcode attempts**, passcodes are 4-10 digits.
6. **`TOTAL_WORDS = 3261`** but the bundled file has **3263** words (progress percentages and "remaining" use the constant).
7. **193 duplicate `word` + `category` pairs** in the bundled data share one progress id.
8. **Import limits are smaller than the bundled data** (word 100 / meaning 500 / example 1000 vs 176 / 933 / 1257), so exporting and re-importing the Default set would truncate text.
9. **"Reappears after 100 days"** in the Mark as Learned dialog, while the code's master interval is 60 days.
10. **`getDailyCount` always returns the maximum** of each intensity range (min is never used).
11. **`computeLearnedWordStats`:** `new = total - learning` ignores learned words while `remaining = total - learned - learning`; confirm which meaning is intended.
12. **Search:** non-Latin queries become empty; `đ` is dropped (`đường` → `uong`); `searchVocabulary(q, 0)` returns one result.
13. **Learning time** uses the UTC date and can add a negative duration if the clock moves backwards.
14. **Old SQL file `supabase/sql/2025-05-nickname-passcode.sql`** does not match the live database (it defines a function the database does not have, and its verify function has an argument-shadowing bug).

## Counts
206 cases: A 26, B 7, C 25, D 17, E 26, F 17, G 13, H 11, I 13, J 8, K 8, L 6, M 9, N 12, O 8.
Already covered by a test: 53. Partly covered: 32. Covered by an e2e flow only: 13. Not covered: 108.
