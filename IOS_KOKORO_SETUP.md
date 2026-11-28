# iOS Kokoro voices: build, install and test (no Mac needed)

Target: **iPhone 13**, free Apple ID, Windows or Mac PC. The app (with the native Kokoro plugin, FB-73) is built by GitHub Actions on a
macOS runner. You download an **unsigned `.ipa`** and sign + install it with **Sideloadly**. The TestFlight route (needs the paid
Apple Developer Program) and a Mac/Xcode route are described afterwards. Nothing here needs secrets for the first route.

---------------------------------------------------------------------------------------------------------------------------------

## 1. CI + Sideloadly route (start here)

### 1.1 Run the build
1. GitHub > repository **hoctusach/lazy-vocabulary** > **Actions** > workflow **"iOS build, tests and unsigned IPA"** (file `ios.yml`).
   (GitHub mobile app: Repository > Actions > the workflow > "Run workflow".)
2. **Run workflow**, branch **`feat/ios-kokoro`** (or `main` after the PR is merged) > green **Run workflow** button.
3. Wait about 20-35 minutes. Three jobs run:
   * **Swift unit tests (simulator)**: G2P parity with the Android tests, post-FX, model status / plugin API on an iOS Simulator.
   * **Unsigned IPA (Release, device)**: web bundle (`VITE_ENABLE_PRO=true npm run build:mobile`), `cap sync ios`, `xcodebuild archive`
     with `CODE_SIGNING_ALLOWED=NO`, packages `Payload/App.app` into the `.ipa`.
   * **Simulator build + smoke test**: builds for the simulator, boots an iPhone + an iPad, launches the app and fails if the screen is
     blank (white/solid splash = WebView did not boot). Screenshots are in the `simulator-screenshots` artifact.
4. Open the finished run > **Artifacts** > download **`LazyVocabulary-unsigned-ipa`** (a zip that contains `LazyVocabulary-unsigned.ipa`).
   Unzip it. Artifacts are kept for 90 days by default.

### 1.2 Install Sideloadly and sign with your free Apple ID
1. Install **Sideloadly** (https://sideloadly.io) on your PC. On **Windows** also install **iTunes and iCloud from apple.com** (the
   standalone installers, *not* the Microsoft Store versions): Sideloadly needs Apple's USB driver.
2. Connect the iPhone 13 with a cable, unlock it, tap **Trust this computer**.
3. In Sideloadly: drag `LazyVocabulary-unsigned.ipa` onto the window, pick your iPhone, type your **Apple ID**, press **Start**, enter the
   password (an app-specific password if two-factor asks for it). Sideloadly signs the app with a free "Personal Team" certificate and installs it.
   * If it complains the bundle id is taken, open **Advanced options** and change the bundle id to
     `com.<yourname>.lazyvocabulary`. (Pro purchase / ads / push-style entitlements do not work in a sideloaded build anyway, see "known limits".)

### 1.3 First launch on the iPhone
1. **Enable Developer Mode**: Settings > Privacy & Security > **Developer Mode** > on > the phone restarts > confirm "Turn On" and enter the passcode.
   (The switch only appears after you tried to install a developer-signed app; if it is missing, install with Sideloadly first.)
2. **Trust the profile**: Settings > General > **VPN & Device Management** > your Apple ID under "Developer App" > **Trust**.
3. Open **Lazy Vocabulary**.

### 1.4 Free-account limits
* The signature lasts **7 days**. After that the app will not open: connect the phone and press Start in Sideloadly again with the same IPA
  (your data stays, as long as you do not delete the app). Sideloadly can also auto-refresh while the PC is on and the phone is on the same Wi-Fi.
* A free Apple ID may have **3 sideloaded apps** active at once and a limited number of new App IDs per week.
* Each CI build is a new IPA; installing over the old one keeps the app data.

---------------------------------------------------------------------------------------------------------------------------------

## 2. What to test on the iPhone

Use Wi-Fi and keep the app in the foreground until the download finishes. Free storage needed: about 350 MB (iPhone 13 has 4 GB RAM, so
it gets the **fp32** model, about 310 MB; devices with less than 3 GB get int8, about 110 MB).

| # | Test | Expected |
|---|------|----------|
| 1 | **Fallback first**: turn on **Airplane mode**, open the app, play a word | System (Apple) voice speaks. No Natural voice row error. Turn Airplane mode off. |
| 2 | **Download**: More tab > **Natural voice**; or wait for the automatic download on Wi-Fi | Progress pill "Downloading natural voice… NN%", ends with "Natural voice ready", Heart becomes the default voice. On cellular data a one-time prompt asks first. |
| 3 | **Heart** (audio sheet > voice dropdown > Natural voices) | Clear female US voice, word + meaning + example read, no clicks/ticks, no long gaps between sentences. |
| 4 | **Michael** (Pro unlock needed; the build has Pro enabled for testing) | Male US voice. |
| 5 | **Speed**: change the speech speed in the audio sheet | Speed changes audibly for both voices; extremes stay intelligible. |
| 6 | **Mute** | Mute silences immediately, playback keeps its timing; unmute restores. |
| 7 | **Interrupt**: tap Next / Pause while a sentence is playing | Stops within a fraction of a second, no stuck audio or double voices. |
| 8 | **Screen lock / background**: start auto-play, lock the phone | Playback continues (Now Playing card on the lock screen with Play/Pause/Next). Known limit: iOS may suspend the WebView during long pauses between words (see 4). Report how many words play. |
| 9 | **Call / Siri / alarm interruption** | The word ends, playback continues afterwards. |
| 10 | **Delete + re-download** (More > Natural voice > Delete / Re-download) | Voice list drops to system voices; re-download works (resumes if you cancel and restart). |
| 11 | **Cancel mid-download, kill the app, reopen** | Download resumes where it stopped, no corrupted voice (sha256 is verified). |
| 12 | **Apple voice hint** (FB-74): uninstall nothing; if Ava/Evan/Nathan are NOT installed, a one-time toast appears (EN, or VI on a Vietnamese phone) | Explains Settings > Accessibility > Spoken Content (iOS 26: Read & Speak) > Voices > English > "Ava (Premium)" / "Evan (Enhanced)". It never appears again after it was shown. |
| 13 | **Apple premium preference**: download "Ava (Premium)" in Settings, reopen the app, delete the Natural voice (so the system voice is used) | The default system voice is Ava (Premium); with no Ava, Evan then Nathan (Enhanced). A voice you pick yourself always wins. |
| 14 | **Memory**: play 10 minutes with Heart | No crash. (iOS can kill the app under memory pressure; the model is released after 10 idle minutes and on a memory warning.) |

---------------------------------------------------------------------------------------------------------------------------------

## 3. Getting logs without a Mac

* **Best, built in:** every native step prints a line starting with `[kokoro]` (download failures with the error code, speak errors with
  the code OOV / NOT_DOWNLOADED / ENGINE_ERROR) to the system log. The error code is also shown in the app (`downloadState` error) and falls back to the system voice.
* **Windows / Mac PC, no Xcode:** a live device log is available with **libimobiledevice**'s `idevicesyslog` (Windows build:
  https://github.com/libimobiledevice-win32/imobiledevice-net or the `libimobiledevice` package on Mac/Linux). Run
  `idevicesyslog | findstr kokoro` (Windows) or `idevicesyslog | grep -i kokoro`.
  **3uTools** (Windows, free) > Toolbox > **Realtime Log** shows the same stream; filter on `kokoro` or `App`.
* **Crash logs:** iPhone Settings > Privacy & Security > **Analytics & Improvements > Analytics Data** > entries starting with `App-` (share as text).
* **Mac only:** Console.app > select the iPhone > filter `kokoro`; Safari > Develop > iPhone > the WebView for JavaScript console errors.
* No in-app log export exists yet (it is not part of this change). For a bug report, send the CI run URL, the iPhone model/iOS version,
  the test number above and the `[kokoro]` lines.

---------------------------------------------------------------------------------------------------------------------------------

## 4. Known limits

* **iOS background CPU/audio limits.** Kokoro synthesizes on the CPU. With the screen locked, iOS keeps playing audio (the app has the audio
  background mode and a silent loop for Now Playing) but may suspend the WebView; the next word is then only scheduled when it wakes up.
  There is no native queue on iOS (the Android foreground-service queue has no equivalent), see `IOS_PLAN.md` section 5.
* **Free Apple ID:** 7-day signature, 3 apps, no StoreKit (the Pro purchase needs the paid program, TestFlight or App Store), no AdMob
  entitlements checks. The CI build has Pro enabled (`VITE_ENABLE_PRO=true`) like the Android test builds.
* The model download is foreground with resume; there is no background URLSession.
* Not compiled by a human on a Mac: if a CI step fails, the log of that job is the source of truth (Actions > the run > the failed step).

---------------------------------------------------------------------------------------------------------------------------------

## 5. TestFlight route (needs the paid Apple Developer Program, $99/yr)

Ready but disabled: `.github/workflows/ios-testflight.yml` (and a commented `ios-testflight` workflow in `codemagic.yaml`).
It does nothing unless **all** secrets exist **and** you type `yes` in the run form.

1. Enroll at developer.apple.com/programs and wait for approval.
2. Register the app: Certificates, Identifiers & Profiles > Identifiers > `com.hoctusach.lazyvocabulary` (enable In-App Purchase), and in App
   Store Connect > My Apps > New App (`IOS_PLAN.md` section 2).
3. App Store Connect > Users and Access > Integrations > **App Store Connect API** > generate a key with the **Admin** (or App Manager) role.
   Download the `.p8` once. Note the **Key ID** and the **Issuer ID**.
4. GitHub > Settings > Secrets and variables > Actions > add these **repository secrets** (values never go into git):

   | Secret | Value |
   |--------|-------|
   | `APP_STORE_CONNECT_KEY_ID` | the key id |
   | `APP_STORE_CONNECT_ISSUER_ID` | the issuer id |
   | `APP_STORE_CONNECT_PRIVATE_KEY` | the whole text of `AuthKey_XXXX.p8` |
   | `APPLE_TEAM_ID` | 10-character team id (developer.apple.com > Membership) |
   | optional `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMOB_IOS_APP_ID`, `VITE_ADMOB_IOS_BANNER_ID` | production web config / real AdMob iOS ids |

   Signing is Xcode automatic signing through the API key (`-allowProvisioningUpdates`): Apple creates the distribution certificate and the
   App Store profile in the cloud, so no `.p12` or fastlane match repository is needed.
5. Actions > **iOS TestFlight (signed)** > Run workflow > `confirm = yes`. The build number is the run number. After processing, install through
   the TestFlight app.
6. Codemagic alternative: remove the leading `# ` of the `ios-testflight` block in `codemagic.yaml`, add the API key integration named
   `codemagic_asc_key` and the group `lazyvocab_ios` (`IOS_PLAN.md` section 3A).

---------------------------------------------------------------------------------------------------------------------------------

## Appendix: Mac / Xcode route (optional)

1. macOS with **Xcode 26** (Capacitor 8's prebuilt binaries are built with Swift 6.2): `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
2. Node as in CI (`node 22`; `.nvmrc` says 18 for the web build): `npm ci`.
3. `VITE_ENABLE_PRO=true npm run build:mobile && npx cap sync ios` (never from `docs/`, FB-28).
4. Optional: `scripts/ios/fetch-sherpa-onnx.sh` (verifies the pin; Xcode itself downloads the xcframework through Swift Package Manager).
5. Open `ios/App/App.xcodeproj` (SPM, no CocoaPods, no `.xcworkspace`). Target **App** > Signing & Capabilities > your Personal Team; change the
   bundle id suffix if Xcode says it is taken. Run on the iPhone (Developer Mode + Trust as in 1.3).
6. Tests: open `ios/App/KokoroTtsKit/Package.swift` in Xcode and run the `KokoroTtsKit-Package` scheme tests, or
   `cd ios/App/KokoroTtsKit && xcodebuild test -scheme KokoroTtsKit-Package -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`.
7. Logs: Xcode console filter `kokoro`; Console.app; Safari Web Inspector for the WebView.
