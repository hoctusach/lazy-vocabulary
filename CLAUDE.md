# Lazy Vocabulary — working rules

- **Regression catalog.** Every new user-reported bug or feedback item gets an `FB-xx` entry in `tests/regression/USER_FEEDBACK.md` and a regression test whose title contains `[FB-xx]` (vitest `it`/`describe`, or e2e test title; never rename e2e ids). If it cannot be automated, add an explicit `proxy/manual` note in the catalog instead.
- **Release gate.** `npm run test:regression` must pass before any release, plus a fresh-bundle e2e: `npm run test:e2e -- --build --grep FB-`. The script itself runs e2e without `--build` (it reuses `E2E_DIST`, so a stale bundle can hide failures). Also run full `npx vitest run` and `node e2e/run.mjs --build`; the only allowed failure is the known EDGE-08.
- **Code changes are made with Claude Code.**
- **`docs/` is the live website** (`npm run build` rewrites it). Never run the build for tests (e2e builds into `E2E_DIST`), never modify or commit `docs/`.
- **Never** push to Production / use live Supabase or Play Console without the owner. Never print or commit secrets.
- Don't bump the version (1.0.2 / versionCode 3) unless asked. Keep EN/VI strings consistent.
- Pro gating, all 5 themes and speech-across-tabs behavior must stay intact.
