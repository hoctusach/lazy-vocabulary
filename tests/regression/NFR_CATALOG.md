# NFR catalog (non-functional tests)

Performance, device-matrix and reliability checks. Separate from the `FB-xx` regression catalog (`USER_FEEDBACK.md`): NFR tests
do **not** run in `npm test` / `npm run test:e2e` / `npm run test:regression`, and they are not part of the release gate unless
the owner decides so. The CI job (`.github/workflows/nfr.yml`) is non-blocking (`continue-on-error`).

## How to run
| Command | What |
|---|---|
| `npm run test:nfr` | everything below |
| `npm run test:nfr:perf` | `vitest -c vitest.nfr.config.ts` (PERF-06/07/08/10, `tests/nfr/*.nfr.ts[x]`, one worker) + browser PERF-01..05, 09 |
| `npm run test:nfr:devices` | NFR-DEV-* (device matrix) |
| `npm run test:nfr:reliability` | NFR-REL-* |

Browser suites live in `e2e/nfr/` and reuse the e2e harness (puppeteer-core + Chrome, fake Supabase backend, localhost only, global
"nothing escaped" network guard). Note: the e2e harness is **puppeteer**, not Playwright; accessibility uses `axe-core` (devDependency)
injected into the page, not `@axe-core/playwright`.
- Bundle: `NFR_DIST` (default `/tmp/lv-nfr-dist`, built with the fake-backend config via `vite build`, never `docs/`). `--build` forces a rebuild.
- Results: `NFR_RESULTS` (default `/workspace/qa/nfr-results.json`; one file per sub-script, e.g. `nfr-results-nfrdev.json`), vitest metrics in `NFR_VITEST_RESULTS`.
- `NFR_BUDGET_SCALE=2` multiplies wall-clock budgets (slow/shared box; CI uses 2). Size budgets are never scaled. `NFR_RUNS` = runs per median (default 5).
- `NFR_AAB_PATH=/path/app-release.aab` enables NFR-PERF-05 (skipped otherwise).
- Statuses: PASS / FAIL / SKIP / **KNOWN** (test marked `known:` with a FINDING below: reported, does not fail the run; a known test that starts passing prints a warning to remove the flag).

Budgets are in `tests/nfr/budgets.json` (`baseline` = median measured on the dev box, 2026-11-28, Chrome headless, `budget` ≈ baseline × 1.2-1.3,
with an absolute floor for sub-10 ms values and the leak metrics so noise cannot flake them). Update baseline+budget deliberately in the same PR as a justified change.

## PERF
| ID | What | Baseline | Budget | Rationale |
|---|---|---|---|---|
| NFR-PERF-01 | Cold start in a fresh context, median of 5: FCP / React root mounted / DOMContentLoaded | 216 / 194 / 161 ms | 280 / 250 / 210 ms | blank-screen class of bugs (FB-15, FB-28) shows up as slow or missing mount |
| NFR-PERF-02 | Learn time-to-interactive: first word rendered; Pause tap round trip | 231 ms; 29 ms | 300 ms; 60 ms | the first thing users do |
| NFR-PERF-03 | Same under 4x CPU throttle (mid-range phone proxy), median of 3 | 800 ms | 1050 ms | real phones are 3-6x slower than the CI box |
| NFR-PERF-04 | gzip size of JS/CSS in the production bundle | JS total 765.7 KB, largest chunk 685.5 KB, initial JS 745.5 KB, CSS 25.3 KB, index.html 6.6 KB | 920 / 825 / 895 / 31 / 8 KB | see FINDING-5 |
| NFR-PERF-05 | AAB size (`NFR_AAB_PATH`), warn above 80 MB | 1.0.7: ~75.7 MB (not measured in CI) | 95 MB hard, 80 MB warn | Play download size; skipped when no path |
| NFR-PERF-06 | Parse + normalise the built-in vocabulary (3965 rows, 3740 distinct keys, 1.18 MB JSON): time + retained heap | 2.3 ms parse, 0.07 ms normalise, 3.1 MB heap | 10 ms, 5 ms, 4 MB (JSON 1.5 MB) | data growth guard |
| NFR-PERF-07 | Word Summary render (jsdom) with 20 and 500 rows per lane (x3 lanes) | 22 ms / 180 ms; 9033 DOM nodes, 57 MB heap for 1500 rows | 80 / 350 ms; 11500 nodes; 75 MB | rows are not virtualised (daily lists are ~20, so this is headroom; jsdom numbers are a relative guard, not phone timings) |
| NFR-PERF-08 | Daily selection: `buildTodayQueue` over all words with 1500 learned rows; `filterByBuiltinGroups` | 3.6 ms; 1.4 ms | 12 ms; 6 ms | selection must stay instant |
| NFR-PERF-09 | Leak check: 15 warm-up + 100 Next-word cycles, forced GC via CDP, heap / DOM nodes / JS listeners growth | +0.27 MB, +17 nodes, +1 listener | 2 MB, 100, 10 | noise floor; a per-cycle leak (>=20 KB or >=1 node/cycle) trips it |
| NFR-PERF-10 | Native TTS queue and notification updates with the Capacitor plugin mocked: build 200-word queue; 2000 `updatePlaybackService`; 50 `setPlaybackQueue` | 0.25 ms; 2 ms (~1M/s); 6 ms | 5 ms; 50 ms; 30 ms | JS-side cost of per-word notification refresh; also asserts none are dropped |

## DEV (device matrix)
Devices: small Android 360x640, Pixel 7 412x915, large phone 480x1040, Android tablet 800x1280, iPhone SE 375x667, iPhone 13 390x844,
iPad 9.7" 768x1024, iPad portrait 820x1180, iPad landscape 1180x820 (Chrome emulation with matching UA; real WKWebView/Samsung rendering is proxy/manual).
| ID | What | Baseline | Gate |
|---|---|---|---|
| NFR-DEV-01-`<device>` (9) | no horizontal overflow, nothing past the viewport edge, no clipped text (`overflow:hidden` with scrollWidth>clientWidth; visually-hidden `sr-only` and intentional `text-overflow: ellipsis` are excluded), Pause / Next Word / Audio / Quick Search visible on the first screen and >= 44x44 px, phone tab bar (<768 px) present at the bottom with every tab >= 44 px, checked on Learn, Progress, Library, More | phones: Pause 100-140x72, Next 56 high, tab bar min 55 px; tablets/iPads: 44x44 icon buttons | all pass except FINDING-1 |
| NFR-DEV-02-`<device>` (4) | dark theme, Learn: axe-core `color-contrast` (WCAG 2 AA) on small Android, Pixel 7, iPhone 13, iPad landscape | 0 violations | 0 |
| NFR-DEV-03-`<theme>` (5) | all 5 themes in dark on Pixel 7, axe `color-contrast` on Learn / Progress / Library / More | 0 except Bold Blocks | 0, FINDING-2 |
| NFR-DEV-04-`<130\|200>-<device>` (6) | root font size 130% / 200% (the UI is rem based; Android font scale proxy) on small Android, Pixel 7, iPhone SE: no overflow/clipping on 4 tabs, bottom nav kept, Pause/Next >= 44 px and scroll into view | 130%: pass; 200%: FINDING-3 | |

## REL (reliability)
| ID | What | Baseline | Budget |
|---|---|---|---|
| NFR-REL-01 | go offline mid-session (CDP offline): Next word x5, all tabs, Pause; back online; no uncaught errors/blank | pass | - |
| NFR-REL-02 | cold start as the installed app offline (bundle local, `navigator.onLine=false`, backend aborted): time to first word, advance, browse tabs (a pure web build has no service worker, so a truly offline browser cannot load the page at all) | 245 ms | 340 ms |
| NFR-REL-03 | Slow 3G (500 kbps, 400 ms RTT, gzip server) web cold start to first word | 13.5 s for 773 KB transferred | 17.5 s |
| NFR-REL-04-`abort`/`503`/`hang` | Supabase unreachable: connection aborted / every call 503 / never answers. Signed-in user still gets a card from local data, can advance and browse | 255 / 247 ms; hang = FINDING-4 | 340 ms |

## Findings (real issues; the tests are marked `known` so the suite stays green; fix then remove the flag)
- **FINDING-1 (layout, medium):** viewports 768-815 px wide (Android tablets such as 800x1280, 9.7" iPads at 768) use the wide "desktop" layout whose Learn stack is 768 px wide inside a padded `main`, so it overflows: the Audio/Pause/Next/Search/Mark-as-learned column sits at x=772..816 on an 800 px screen and is cut off (`overflow-x: clip` hides the page scrollbar). 820 px and up are fine. Fix: in `src/styles/tablet.css` make `.lv-learn-stack` `width: 100%; max-width: 48rem; min-width: 0` and let the `md:flex-row` card row (`VocabularyMainNew.tsx`) wrap or use `min-w-0`; or start the wide layout at ~830 px. Affects NFR-DEV-01-android-tablet, NFR-DEV-01-ipad-9in. (The FB-69 e2e only tests 834+.)
- **FINDING-2 (contrast, low):** Bold Blocks dark, Learn screen: an `<em>` is `#702e20` on `#ff5a36` = 3.22:1 (< 4.5:1). Fix: darken the text token or lighten the background for that highlight in the blocks dark theme (`src/styles/themes.css`). NFR-DEV-03-blocks.
- **FINDING-3 (large font, medium):** at 200% font scale the Progress week strip (day dots 273..485 px on a 360-412 px screen) and a Library button (250..434 px) run past the right edge; 130% is clean. Fix: let the week strip wrap/scroll and make the Library action `flex-wrap`/`min-w-0`; also the tiny `text-[10px]` labels use px so they do not scale. NFR-DEV-04-200-*.
- **FINDING-4 (reliability, medium):** if the Supabase request never answers (captive portal, black-holed network) Learn stays on "Gathering today's wordy surprises…" indefinitely; with an aborted or 5xx backend it falls back to local words in ~250 ms. Fix: put a timeout (8-10 s) on the daily-selection fetch and fall back to the local list. NFR-REL-04-hang.
- **FINDING-5 (bundle, medium, no test failure):** one 2.17 MB (686 KB gzip) entry chunk holds the app plus the 1.3 MB vocabulary JSON; 745 KB gzip of JS is on the critical path (13.5 s on Slow 3G for the web build; the Android/iOS apps ship the bundle locally so it only affects parse time: see 4x CPU ~800 ms). Fix: lazy-load `defaultVocabulary.json` and `xlsx`/recharts (`import()` / `manualChunks`). The budget currently guards against it growing further.
- Observation: Word Summary renders every row (no virtualisation): 1500 rows = ~9k DOM nodes / 57 MB in jsdom. Fine at today's ~20 words/day.
- Observation: during a cold start without the backend the card `<h1>` briefly re-renders (text empty for a frame) — harmless, but tests must settle before reading it.
