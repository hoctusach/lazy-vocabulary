# Passcode hint + "Forgot passcode?" — setup (awaiting approval)

Nothing below is applied or deployed. The live project (`vijvcojvemkzgpzpowzh`) is untouched.

## Live changes awaiting approval
1. **SQL** `supabase/sql/2026-11-28-passcode-hint.sql`: column `nicknames.passcode_hint` (<= 60), `get_passcode_hint(text)`, `set_passcode_hint(text, text)`; EXECUTE for `service_role` only. `upsert_or_verify_profile` is not changed.
2. **Edge Functions** (deploy with the same JWT setting as the siblings; the app sends no Authorization header):
   - new `passcode-hint`, new `update-passcode-hint`, updated `set_nickname_passcode`.
3. **App release** (hint field, Forgot screen, Settings row).
4. Admin tool `supabase/sql/admin-manual-passcode-reset.sql`: run by hand in the SQL editor only when needed.

**Order: SQL -> functions -> app release.** Before the SQL, `passcode-hint` answers `{hint:null}` and sign-up ignores the hint, so login and sign-up never break; the Settings row answers "Hints are not available yet" until then.

## Rollback
SQL: see the ROLLBACK block at the top of the SQL file. Functions: redeploy the previous `set_nickname_passcode`, delete the two new ones. The app tolerates both.

## Manual checklist (after approval)
- [ ] Sign up with a hint, then Forgot passcode? shows it.
- [ ] Hint containing the passcode is refused in the app and by the server.
- [ ] Unknown nickname and a nickname without a hint show the same message.
- [ ] Settings -> edit/clear the hint works; anon REST cannot select `passcode_hint`.
- [ ] 360px phone and iPad look; Android/iOS builds.

## Risks and deferred
- Passcodes are still stored in plaintext in `nicknames.passcode`; the hint is readable by anyone who knows a nickname, and `passcode-hint` has no rate limit.
- Deferred (not in this PR): recovery codes, Google/Apple login, lockout / attempt counters, enumeration changes.
- Support contact is the address already shown in the app footer (`SUPPORT_EMAIL` in `src/config/links.ts`).
