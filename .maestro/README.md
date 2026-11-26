# Android end-to-end tests (Maestro)

33 flows, one per test case. The case number is in each flow's `name` (`#9 ...`).
Tags: `smoke` (run every release), `regression`, `pending` (needs the background-playback branch merged first: cases 30-33).

## One-time setup on Windows
1. Install JDK 17+ and Node 20+. Install Android Studio (or just platform-tools) so `adb` works.
2. Install Maestro: download the latest `maestro.zip` from https://github.com/mobile-dev-inc/maestro/releases, unzip, add its `bin` folder to PATH. Check with `maestro --version`.
3. Phone: Settings > Developer options > USB debugging on, cable plugged in. `adb devices` must show `device`. Or start an emulator from Android Studio.
4. Allow scripts for this session: `Set-ExecutionPolicy -Scope Process Bypass`

## Run
```powershell
.\.maestro\scripts\run-e2e.ps1 -Tags smoke        # build + install + smoke flows
.\.maestro\scripts\run-e2e.ps1 -Tags regression -SkipBuild
maestro test .maestro\flows\09_mark_learned.yaml -e NICKNAME=e2e_tester -e PASSCODE=123456   # one case
```
Results: `e2e-results\report.xml` (and `logcat.txt` on failure).

## With Claude Code
```powershell
claude "/e2e-android smoke"
claude -p "/e2e-android regression" --allowedTools "Bash(powershell:*) Bash(adb:*) Bash(maestro:*) Read"
```
The second form is non-interactive and is what a bot can call; it exits non-zero on failure.

## Notes per case
- Login needs network (Supabase). Cases 3 and 15 also need it. The test user is `E2E_NICKNAME` / `E2E_PASSCODE` (default `e2e_tester` / `123456`).
- Import cases 18-24, 27 use files from `fixtures/`, copied to Download by `scripts/push-fixtures.ps1`. The Android file picker differs between phones; if the file is not found, adjust `common/import_file.yaml`.
- Case 29 follows current `main` behavior (NEW TODAY / DUE TODAY lists exist for the first open of a day). On an emulator, run `scripts\new-day.ps1` first to move the date one day forward.
- Cases 30-33 are tagged `pending`. For 30 and 31 also run `scripts\check-notification.ps1` after the flow, because Maestro cannot read the lock screen.
- Maestro cannot hear audio. Speech cases only check the buttons and screen state.
- Flows match visible text and `aria-label`s (`Next Word`, `Mark as Learned`, `Quick Search`...). If a label changes in the app, update the flow.
- These flows were written from the source code and have not been run on a device yet. Expect to adjust a few selectors on the first run.
