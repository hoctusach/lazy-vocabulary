# Lazy Vocabulary on iOS / iPadOS: plan and Finley's checklist

Universal app (iPhone + iPad), Capacitor 8 shell, bundle id `com.hoctusach.lazyvocabulary`, display name **Lazy Vocabulary**.
The `ios/` project already existed on `main`; this branch (`feat/ios`, FB-67/68/69) completes it. Never run `npx cap add ios` (it would
clobber the project). After web/native changes use `npx vite build --outDir capacitor-www --emptyOutDir --base ./ && npx cap sync ios`.
The web bundle never comes from `docs/` (FB-28).

## 0. Start here (Finley)

1. **Enroll in the Apple Developer Program** ($99/yr, individual or organization). Approval can take from hours to a few days.
2. **Reserve the app name in App Store Connect the same day you are enrolled** (My Apps > + > New App > Name = `Lazy Vocabulary`).
   Names are first come first served; do this before anything else, even before the build is ready. A reserved name stays yours for
   a limited time, so also upload a first build before it lapses.

## 1. App Store naming and copy

- **App Store name stays exactly `Lazy Vocabulary`.** The exact name was not found on the US or Vietnam App Store. A similar app,
  **"Lazy Vocab"**, exists in Vietnam. We still keep `Lazy Vocabulary` (not identical, and it matches the Play Store and the in-app
  brand). If App Store Connect reports the name is taken, fall back to `Lazy Vocabulary: Learn Words`, never a rename of the app itself.
- The app will later target learning **any language**, not only English. So store copy must not be English-only:
  - **Subtitle (30 chars max): `Learn words in any language`** (27 chars).
  - Keywords (100 chars, comma separated, no spaces after commas, do not repeat words from the name/subtitle). Mix English, Vietnamese and
    generic language-learning terms, for example:
    `vocabulary,flashcards,spaced repetition,từ vựng,học từ vựng,học tiếng anh,IELTS,TOEIC,phrasal verbs,idioms,language,polyglot`
    (trim to 100 chars; localise a Vietnamese keyword set in the vi-VN App Store Connect localisation).
  - Description: lead with "learn words in any language", then the current English/Vietnamese content, listening mode, spaced
    repetition, themes. Provide an `en-US` and a `vi` localisation.
- Category: Education (primary), Reference or Productivity (secondary).

## 2. What Finley must prepare (checklist)

| # | Item | Notes |
|---|------|-------|
| 1 | Apple Developer Program ($99/yr) | Needed for signing, TestFlight, App Store. |
| 2 | **Reserve the name in App Store Connect right after enrollment** | `Lazy Vocabulary`. Do it early. |
| 3 | App Store Connect **app record** | My Apps > + > New App. Platform iOS, language English (US), bundle id, SKU e.g. `lazyvocabulary-ios`. |
| 4 | Bundle ID `com.hoctusach.lazyvocabulary` | Already set in the Xcode project and `capacitor.config.ts`. Register it under Certificates, Identifiers & Profiles > Identifiers (Codemagic can do this through the API key). Enable the **In-App Purchase** capability. |
| 5 | Signing certificates / provisioning profiles | Easiest: let Codemagic create and manage them (Apple Distribution certificate + App Store profile) through an App Store Connect API key. Manual path: Apple Distribution cert (.p12) + App Store profile. Never commit them. |
| 6 | **App Privacy labels** (nutrition labels) | Declare: identifiers/usage data for analytics (Google Analytics), Device ID for ads (AdMob, if ATT allowed), Purchases, User ID (nickname, Supabase account), Other user content (word sets). Not linked to identity unless the nickname/account is; tracking = yes while AdMob ads are on. |
| 7 | **Privacy policy URL** | Required. Reuse the Play Store policy page but make sure it names iOS, AdMob/ATT, Supabase, Google Analytics and the delete-account flow. Also a Support URL. |
| 8 | **Screenshots** | Required sizes: **iPhone 6.9"** (1320x2868 or 1290x2796), **iPhone 6.5"** (1284x2778 or 1242x2688), and, **because the app is universal, iPad 13" screenshots (2064x2752 portrait or 2752x2064 landscape)**. 3 to 10 per size. iPad 11" is optional if 13" is provided. |
| 9 | **Age rating** questionnaire | Expected 4+ (no objectionable content). Answer the ads/user-generated-content questions honestly (users create their own word sets, only visible to themselves). |
| 10 | **IAP product for Pro** | App Store Connect > Monetization > In-App Purchases > Non-Consumable, **Product ID `pro_unlock`** (same id as Google Play), price tier ~ US$2.99, localised name/description (en, vi), review screenshot. Add it to the app version before submitting. Also complete the Paid Apps Agreement, banking and tax forms. A sandbox tester account is needed to test. |
| 11 | **AdMob iOS app + ATT** | Create an iOS app in AdMob, get the **iOS app id** (`ca-app-pub-xxxx~yyyy`) and a banner ad unit id. Provide them as `VITE_ADMOB_IOS_APP_ID` / `VITE_ADMOB_IOS_BANNER_ID` and replace `GADApplicationIdentifier` in `ios/App/App/Info.plist` (it currently holds Google's TEST id). Link the app to App Store in AdMob. In AdMob > Privacy & messaging create the GDPR/UMP message and enable IDFA explainer message. The ATT prompt text is `NSUserTrackingUsageDescription` (already in Info.plist). |
| 12 | **Review notes / demo account** | Explain: no login needed (nickname + passcode accounts are optional); give a demo nickname/passcode if you want reviewers to see synced data; explain that audio plays words aloud and background audio is used for hands-free listening; explain Pro is a one-time IAP with Restore (More tab > Pro > Restore purchase); mention ads use ATT. |
| 13 | Export compliance | `ITSAppUsesNonExemptEncryption=false` is already in Info.plist (only standard HTTPS). |
| 14 | Copy | Subtitle, description, keywords, promotional text, what's new, support URL, marketing URL (optional), copyright. |

Real AdMob/Supabase ids, the App Store Connect API key (.p8) and certificates go into **Codemagic encrypted variables / code-signing
identities only**. Never in git. No live Supabase writes and no Play/Production changes are part of this work.

## 3. No-Mac build path

The CI files in this repo build the **unsigned simulator** app on every iOS-relevant PR; the signed TestFlight build is a manual
Codemagic workflow.

### A. Codemagic (recommended: free tier gives ~500 macOS M2 build minutes per month, handles signing)

1. Sign up at codemagic.io with the GitHub account that owns `hoctusach/lazy-vocabulary`, add the repository, choose "codemagic.yaml".
2. Teams > Integrations > **App Store Connect**: add an API key (App Store Connect > Users and Access > Integrations > App Store
   Connect API > generate key with *App Manager* role; upload the `.p8`, key id, issuer id) and name the integration
   **`codemagic_asc_key`** (the name is referenced in `codemagic.yaml`).
3. Code signing identities > iOS > "Fetch from Apple Developer Portal" with that key: create an *Apple Distribution* certificate and an
   *App Store* profile for `com.hoctusach.lazyvocabulary`. (`ios_signing` in `codemagic.yaml` picks them up.)
4. Variable group **`lazyvocab_ios`**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMOB_IOS_APP_ID`,
   `VITE_ADMOB_IOS_BANNER_ID` (mark secure).
5. Start workflow **`ios-simulator`** first (unsigned; confirms the project compiles), then **`ios-testflight`** (build number = latest
   App Store Connect build + 1, archive, upload to TestFlight). Submit for review from App Store Connect.

### B. GitHub Actions macOS runner (`.github/workflows/ios.yml`)

Runs on `macos-15` for PRs touching `ios/**`, `src/**`, etc.: `npm ci` > `vite build` to `capacitor-www` > `cap sync ios` >
`xcodebuild ... -sdk iphonesimulator CODE_SIGNING_ALLOWED=NO` (iPhone + iPad, no secrets) > upload the `.app` > a **non-blocking
simulator smoke test** that boots an "iPad Pro 13-inch (M4)" and an "iPhone 16 Pro", installs, launches the app and saves screenshots as
an artifact. macOS minutes are billed at 10x on private repos, so keep the path filters. Signing on GitHub would need repository
secrets (`IOS_CERT_P12_BASE64`, `IOS_CERT_PASSWORD`, `IOS_PROFILE_BASE64`, `APPSTORE_API_KEY`); not wired up, use Codemagic for that.

### C. Testing on a real device without a Mac

Use TestFlight on Finley's iPhone/iPad after the `ios-testflight` build. Everything marked "needs a device" below is verified there.

## 4. Phases

| Phase | Scope | Status |
|-------|-------|--------|
| 1. Native project | Info.plist (camera, photo library, mic + speech kept, ATT, background audio, AdMob id/SKAdNetwork, `arm64`), universal `TARGETED_DEVICE_FAMILY=1,2`, 4 iPad orientations, brand icon + splash, export-compliance key | Done (FB-67) |
| 2. Responsive layout | Readable column on tablets, two columns (card left, panels right) from 1100 px, phone tabs untouched | Done (FB-69) |
| 3. iOS platform services | StoreKit 2 purchase + Restore (via `@capgo/native-purchases`), AdMob iOS + ATT, AVSpeechSynthesizer voices (playback session, quality ranking, no novelty voices), Now Playing / background audio fallback, status bar guard | Done in TypeScript, untested on device (FB-68) |
| 4. CI | `.github/workflows/ios.yml` (simulator build + smoke), `codemagic.yaml` (simulator + TestFlight) | Done, first run still to be observed |
| 5. First TestFlight build | Run Codemagic, fix compile errors that only a macOS build reveals, on-device pass (audio, IAP sandbox, ATT, ads) | Finley + next Claude Code session |
| 6. Store submission | Metadata, screenshots (iPhone 6.9"/6.5" + iPad 13"), privacy labels, IAP attached, review notes | Finley |
| 7. Post-launch | Native iOS queue (see stubs), Kokoro on iOS, scan-to-import on iOS (camera) | Later |

## 5. Android-only native pieces: audit and iOS status

| Android piece | iOS status |
|---------------|-----------|
| `PlaybackService` foreground service + BigText notification + native queue (FB-52/53/65) | **Fallback, not equal.** iOS has no foreground service or custom notification layout. Implemented: `UIBackgroundModes=audio`, TTS plugin with audio category `playback`, a silent looping `<audio>` + Media Session so the lock screen / Control Center / AirPods show Now Playing (word + meaning) with Play/Pause/Next (`src/services/background/iosNowPlaying.ts`). **Stub:** there is no native queue; if iOS suspends the WebView during a long pause between words, playback stalls until the app is foregrounded. A real fix needs a Swift Capacitor plugin (`AVSpeechSynthesizer` + `MPNowPlayingInfoCenter` + `MPRemoteCommandCenter` driving the queue natively) which needs a Mac/Xcode to build and debug. BigText-style card: not possible on iOS (local notifications cannot be live-updated). |
| Google Play Billing `pro_unlock` | **Implemented**: same `@capgo/native-purchases` JS path; iOS reads StoreKit 2 entitlements (`getPurchases` = `Transaction.currentEntitlements`), `restorePurchases()` = `AppStore.sync()`, no acknowledge step, revoked purchases are not owned. Create the same product id `pro_unlock` in App Store Connect. Needs sandbox test on a device. |
| AdMob + UMP | **Implemented**: iOS ids (Google TEST ids by default), UMP then **ATT prompt before `AdMob.initialize()`**, banner on Progress/Library tabs, no ads for Pro. Replace the test ids before release (see checklist #11). |
| TTS / voices | **Implemented** with `@capacitor-community/text-to-speech` (AVSpeechSynthesizer): voice list from the device, language match prefers Premium > Enhanced > Compact, novelty voices (Bells, Zarvox, ...) hidden. |
| Kokoro natural voices (ONNX in Kotlin) | **Stub.** `isKokoroSupported()` stays Android-only, so on iOS the "Natural voice" row and download are hidden and the system voices are used. A port needs ONNX Runtime for iOS + a Swift plugin, which needs a Mac. |
| File import (CSV/Excel) | Works through the WKWebView document picker (`accept` already lists extensions + MIME types). Export uses `Filesystem` + `Share` (iOS share sheet). Verify on device. |
| Reminders (`@capacitor/local-notifications`) | Same plugin on iOS; permission prompt via the plugin. Verify on device (the `smallIcon` option is ignored on iOS). |
| Custom Capacitor plugins (`PlaybackService`, `KokoroTts`) | Only registered on Android. On iOS `registerPlugin` is never called for them (every call is behind a platform guard). |
| Hardware back button | Android only (`useAndroidBackButton`), nothing needed on iOS. |
| Status bar overlay / background colour | Android-only APIs; guarded so they are not called on iOS. |
| Scan-to-import (camera) | Built on another branch (`feat/fb66-scan-text`). Info.plist already has `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` so the iOS build can use it. |

## 6. Risks and follow-ups

- Nothing here has been compiled with Xcode (no Mac). First CI run may surface Swift/SPM issues; the `ios/` project already existed and
  only plist, assets and signing-neutral settings were changed.
- Apple guideline 3.1.1: Restore Purchases must be reachable (it is in the Pro sheet). Guideline 4.2 (minimum functionality): the app is
  an offline-capable learning tool with native audio, notifications, IAP, so it should pass; mention native features in review notes.
- Guideline 5.1.1(v): account deletion exists in-app (More > Privacy & account).
- Replace Google TEST AdMob ids before submission; ATT text is already present.
- Later: language-neutral content model ("any language"), Vietnamese App Store localisation, native iOS queue plugin, Kokoro on iOS.
