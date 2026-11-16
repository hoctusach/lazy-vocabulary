# Android release guide (Google Play)

App id `com.hoctusach.lazyvocabulary` (Java namespace stays `com.lazy.vocabulary`) · compile/target SDK 36 · Capacitor 8 · web build output `docs/` (also the GitHub Pages site, domain in `public/CNAME` → `www.lazyvoca.fun`).

## 1. Ads (Android app only, light)

- One adaptive **bottom banner**, shown only while the **Progress** or **Sets** tab is active. Hidden on Learn (word cards), More and any other route. No interstitial/rewarded ads.
- **Strict no-op on web/PWA/iOS.** The ad code is a separate lazy chunk (`src/services/ads/adsService.ts`) loaded only when `Capacitor.isNativePlatform() && getPlatform()==='android'`.
- Consent: Google UMP (`requestConsentInfo` → `showConsentForm` when required → only then `initialize`/`showBanner`). The consent flow runs the first time the user opens Progress or Sets. **More → Privacy / ad choices** re-opens the privacy options form.
- The banner sits above the bottom tab bar (`margin` = measured tab bar height) and `--ad-slot` (default 56px, updated from `bannerAdSizeChanged`) is added to the page's bottom padding so nothing is covered or jumps.

### Where to put the real AdMob IDs

Edit **only** `src/config/ads.ts`:

Set the IDs through env (shell, or `.env.production` at the repo root):

```
VITE_ADMOB_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY   # AdMob → Apps → App ID
VITE_ADMOB_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ # AdMob → Ad units → Banner
```

Without them the app uses Google's test IDs (`src/config/ads.ts`). Gradle (`generateAdmobIds`) resolves the manifest app id from env `ADMOB_APP_ID` / `-PadmobAppId`, else `VITE_ADMOB_APP_ID=` in `.env.production` / `.env`, else the test id.

### Release guard

`preReleaseBuild` (so `bundleRelease` and `assembleRelease`) **fails** when the resolved app id is Google's test id (`3940256099942544`), unless `ALLOW_TEST_ADS=true` (or `-PallowTestAds=true`), which prints a loud warning. Debug builds are always allowed. The release workflow requires `ADMOB_APP_ID` / `ADMOB_BANNER_ID` secrets or variables.

## 2. Signing keystore

Create it once and back it up (losing it blocks updates unless you use Play App Signing key reset):

```sh
keytool -genkeypair -v -keystore lazy-vocabulary-release.keystore \
  -alias lazyvocabulary -keyalg RSA -keysize 2048 -validity 10000
```

Signing from env (preferred): `LAZYVOCA_UPLOAD_STORE_FILE`, `LAZYVOCA_UPLOAD_STORE_PASSWORD`, `LAZYVOCA_UPLOAD_KEY_ALIAS`, `LAZYVOCA_UPLOAD_KEY_PASSWORD`. Falls back to `keystore.properties`; with neither, the release stays unsigned.

```bash
set -a; . ~/.lazyvoca-secrets/keystore.env; set +a
cd android && ALLOW_TEST_ADS=true ./gradlew bundleRelease
```

Or, with a file: create `android/keystore.properties` (gitignored; paths are relative to `android/`):

```
storeFile=../../lazy-vocabulary-release.keystore
storePassword=…
keyAlias=lazyvocabulary
keyPassword=…
```

```sh
npm run build:mobile
cd android && ./gradlew bundleRelease assembleRelease -PversionCode=2 -PversionName=1.0.1
```

Outputs: `android/app/build/outputs/bundle/release/app-release.aab`, `…/apk/release/app-release.apk`, `…/mapping/release/mapping.txt` (upload mapping.txt to Play Console → App bundle explorer → Deobfuscation file). Defaults: `versionCode 1`, `versionName 1.0.0`. `versionCode` must increase on every Play upload.

## 3. GitHub Actions

### Secrets (Settings → Secrets and variables → Actions)

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 lazy-vocabulary-release.keystore` (macOS: `base64 -i lazy-vocabulary-release.keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | `lazyvocabulary` (or your alias) |
| `ANDROID_KEY_PASSWORD` | key password |

### Run `Android release` (`.github/workflows/android-release.yml`)

- Manual: Actions → **Android release** → *Run workflow* → enter `version_code` (integer) and `version_name` (e.g. `1.0.0`).
- Tag: push a tag `v1.0.0` → versionName `1.0.0`, versionCode = the workflow run number (use the manual run if you need a specific code).
- It fails early with a clear message if any secret is missing or if `src/config/ads.ts` still has test IDs. Artifacts: AAB, APK, `mapping.txt`.
- Node 22 and Java 21 are used (Capacitor 8 requires Node ≥ 22; `.nvmrc` still says 18 — update it if you rely on it locally).

`Android debug APK` (`android-debug.yml`) builds a debug APK on pull requests (test AdMob IDs are fine there).

## 4. app-ads.txt

AdMob verifies your app via `app-ads.txt` at the **root of the developer website domain listed on the app's Play Store listing**. Add `public/app-ads.txt` (Vite copies it to `docs/` → served at `https://www.lazyvoca.fun/app-ads.txt`) with your publisher ID (AdMob → Account → Publisher ID):

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Set the Play listing's website to `https://www.lazyvoca.fun` (or the root domain if you serve one — AdMob crawls the root of the domain). It is not created yet because the publisher ID is unknown. Crawling can take days.

## 5. Privacy policy and account deletion

- Privacy policy: `public/privacy.html` → **https://www.lazyvoca.fun/privacy.html** (Play Console → App content → Privacy policy).
- Account deletion page: `public/delete-account.html` → **https://www.lazyvoca.fun/delete-account.html** (Play Console → App content → Data safety → *Data deletion* / account deletion URL).
- Both are linked from **More → Privacy & account** in the app. Contact used in both pages: `hoctusach@gmail.com` (already used in the app footer) — change it if needed.
- Review the retention/backup wording in `delete-account.html` against your real Supabase settings.

### Apply the account-deletion SQL (not applied automatically)

`supabase/sql/2026-11-delete-my-account.sql` adds `public.delete_my_account(p_nickname, p_passcode)` (SECURITY DEFINER). The app has no Supabase Auth users: it identifies users by `nicknames` + passcode, so the function re-verifies nickname + passcode, then deletes the user's rows in every public table that has a `user_unique_key` column (`learned_words`, `user_progress_summary`, `share_tokens`, `user_sessions`, …) and the `nicknames` row.

1. Supabase Dashboard → SQL Editor → paste the file → Run (or `psql "$SUPABASE_DB_URL" -f supabase/sql/2026-11-delete-my-account.sql`).
2. Test with a throwaway nickname via the app (More → Delete account) before release.
3. Until it is applied the in-app button shows a friendly "not available yet — email us" message.

## 6. Play Console Data safety hints

Verify against the final app; these are starting points, not legal advice.

| Data | Collected | Shared | Purpose / notes |
| --- | --- | --- | --- |
| Name/nickname (as "User IDs" or "Name") | Yes (optional account) | No | Account management, app functionality; deletable |
| App activity (learned words, progress, study dates) | Yes (optional account) | No | App functionality (sync); deletable |
| Device or other IDs (advertising ID) | Yes (Android app) | Yes, with Google AdMob | Advertising; not optional once ads load, consent via UMP where required |
| Approximate location / IP, app interactions, diagnostics | Collected by AdMob | Yes, with Google | Advertising/analytics/fraud prevention |
| Imported word sets | No (local only) | No | Never leaves the device |

- Data encrypted in transit: yes (HTTPS). Users can request deletion: yes (in-app + web URL above).
- Declare **Ads: yes, contains ads**. Target audience: 13+/general (not children) — if you pick under-13 you'd need the Families policy and a certified ad network setup.
- Advertising ID permission (`com.google.android.gms.permission.AD_ID`) is merged in by the AdMob SDK; answer the Play "advertising ID" declaration accordingly.

## 7. Known follow-ups / notes

- Passcodes are stored unhashed in `nicknames.passcode` and in device `localStorage` (existing behaviour; the privacy policy says so). Consider hashing + rate limiting.
- On a real device, confirm the banner sits exactly above the tab bar with edge-to-edge (target SDK 36); if there is a gap/overlap adjust `margin` in `src/services/ads/adsService.ts`.
- Wide screens (desktop layout, e.g. large tablets) use the desktop layout and show no banner.
