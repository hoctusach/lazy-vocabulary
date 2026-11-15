# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2d82c75f-fbf3-45fe-b388-9aeeec41c431

## Setup

This project requires **Node.js >=18**. A `.nvmrc` file is provided so you can
quickly switch to the correct version with
[`nvm`](https://github.com/nvm-sh/nvm#installing-and-updating).

This project uses Node's ES module syntax; `package.json` specifies `"type": "module"`.

```sh
nvm install
nvm use
```

After cloning the repository, install dependencies before running or building
the project:

```sh
npm install
```

## Supabase Setup

The app now stores learning progress and user preferences in Supabase.

1. Copy the example environment file so you can customize your secrets locally:

   ```sh
   cp .env.example .env
   ```

2. Create a [Supabase](https://supabase.com/) project.
3. In **Project Settings → API** copy the **URL** and **anon key** and paste them into your `.env`:

   ```
   VITE_SUPABASE_URL=your-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   The legacy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables are still read for compatibility, so existing setups that rely on them will keep working.

4. In **Authentication → Providers** enable **Anonymous** and ensure "Allow new users to sign up" is enabled.
5. Run the SQL migration `supabase/sql/2025-01-local-to-db.sql` in the Supabase SQL editor (or your project's migration tooling).

If the Supabase credentials are missing, the app renders a warning message so you know to finish the configuration.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2d82c75f-fbf3-45fe-b388-9aeeec41c431) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

Make sure **Node.js >=18** is installed (see the [Setup](#setup) section) and run `npm install` once after cloning to install the required dependencies.

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Running tests and lint checks

First, ensure dependencies are installed so that **vitest** and **ESLint** are available:

```sh
npm i
```

Then run the test suite and linter:

```sh
npm test       # execute unit tests with vitest
npm run lint   # check code style with ESLint
```

## Test checklist

- [ ] Create or update a profile via `/set_nickname_passcode` and confirm it returns the canonical key.
- [ ] Sign in through `/nickname-passcode-exchange` immediately after setting the profile.
- [ ] Retry sign-in with a wrong passcode and observe the friendly error state.

## Developer workflow

1. Install dependencies with `npm i`.
2. Start the dev server using `npm run dev`.
3. Run `npm test` and `npm run lint` before committing changes.
4. Build for production with `npm run build`.


## Enabling speech playback

Modern browsers block audio playback until the user interacts with the page.
To hear the vocabulary pronunciations, click anywhere on the page (or press any
key) before using the play controls. The first interaction unlocks the speech
synthesis engine so that audio can be played normally.

## Controlling content filtering

The app strips IPA notation and Vietnamese diacritics from speech output by default.
If you prefer to keep them, set a `preserveSpecial` flag in local storage:

```js
import { BUTTON_STATES_KEY } from '@/utils/storageKeys';

localStorage.setItem(BUTTON_STATES_KEY, JSON.stringify({ preserveSpecial: true }));
```

When `preserveSpecial` is `true`, `extractSpeechableContent` will leave those
characters intact when preparing text for speech.

## Voice Settings

The controls panel includes a single **Change Voice** button. Clicking it cycles through the voices available on the current device via `speechSynthesis.getVoices()`. The chosen voice name is stored in `localStorage` so it persists between sessions and is loaded on start.

All audio preferences—voice selection, speech rate, mute/playback state—are saved to the browser's `localStorage` only. These settings never sync to Supabase, so each device keeps its own audio configuration.

## Word display

Any tags inside square brackets or pronunciations written between slashes/parentheses are shown next to the word in a smaller gray font. The main word text no longer includes these annotations.

## Quick Search improvements

Quick Search now normalizes both query text and vocabulary entries so searches
ignore case and diacritics. Results are ranked to prioritize exact matches
before partial or fuzzy matches.

## Mobile app (Android and iOS)

The web app is wrapped with [Capacitor](https://capacitorjs.com/) so the same Vite build runs inside an Android or iOS WebView. The web build is unchanged: `npm run build` still writes the site to `docs/`, and `npx cap sync` copies that folder into the native projects.

Vocabulary sets you import are stored in `localStorage` on the device (see [Word sets](#word-sets) below). Nickname and passcode sign-in does not use a browser OAuth redirect, so no Supabase redirect URL is required for the app. `localStorage` works in the WebView. Speech uses the Web Speech API that Android System WebView and iOS WKWebView provide; if a device has no voices, playback stops instead of crashing. Practice recording uses the WebView speech recognizer when it exists.

### Run on an Android phone or emulator

1. Install [Android Studio](https://developer.android.com/studio) (or the Android SDK command-line tools) and accept the SDK licenses.
2. From the project root:

   ```sh
   npm install
   npm run build:mobile
   ```

   `build:mobile` runs the web build, then `npx cap sync`.
3. Open the Android project:

   ```sh
   npx cap open android
   ```

   Or open the `android/` folder in Android Studio.
4. Pick a device or emulator and press Run.

A debug APK is also produced with:

```sh
cd android
./gradlew assembleDebug
```

The APK is `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to a phone (USB or `adb install -r app-debug.apk`) and open **Lazy Vocabulary**. Debug builds are signed with the automatic debug keystore.

### Run on iOS (Mac + Xcode required)

iOS builds cannot be made on Windows or Linux. On a Mac:

1. Install Xcode from the App Store and open it once so it installs the command-line tools.
2. Install CocoaPods if Xcode asks for it (`sudo gem install cocoapods`).
3. From the project root:

   ```sh
   npm install
   npm run build:mobile
   npx cap open ios
   ```

4. In Xcode, select your Team under Signing & Capabilities, choose a simulator or a paired iPhone, and press Run.

The `ios/` project is already in the repo. After you change the web app, run `npm run build:mobile` again before the next Xcode build.

### Release APK and AAB

Release builds must be signed with your own keystore. Debug builds are not accepted by Google Play.

1. Create a keystore once (keep the file and passwords private):

   ```sh
   keytool -genkeypair -v -keystore lazy-vocabulary-release.keystore -alias lazyvocabulary -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Create `android/keystore.properties` (do not commit it):

   ```
   storeFile=../../lazy-vocabulary-release.keystore
   storePassword=YOUR_STORE_PASSWORD
   keyAlias=lazyvocabulary
   keyPassword=YOUR_KEY_PASSWORD
   ```

3. The Android project already reads that file when it exists and signs the release build with it.

4. Build:

   ```sh
   npm run android:release
   ```

   - APK: `android/app/build/outputs/apk/release/app-release.apk` (sideload or other stores)
   - Play Store bundle: `cd android && ./gradlew bundleRelease`  
     AAB: `android/app/build/outputs/bundle/release/app-release.aab`

You still need a Google Play Console account to ship the AAB, and an Apple Developer account plus a Mac to archive the iOS app in Xcode (Product → Archive).

### Word sets

The built-in list is the **Default** set. Its learning progress keeps using the existing account sync (Supabase). Sets you import are stored only on this device, and each set has its own learned-word progress. The Default set cannot be deleted or renamed.

Why local storage: the word list already lives in the app (the bundled JSON plus anything saved in the browser). Supabase stores account progress for that built-in list, not arbitrary spreadsheets. Keeping imports on the device works offline in the WebView and does not require a new database table.

Import CSV, Excel (`.xlsx` or `.xls`), or JSON from the **Sets** tab (or the Word sets section on a wide screen). The file picker is a normal `<input type="file">`, which the Capacitor WebView supports.

**Columns**

| Column | Required | Accepted header names |
| --- | --- | --- |
| word | yes | word, vocabulary, term |
| meaning | yes | meaning, definition |
| example | no | example, sentence, usage |
| translation | no | translation |
| category | no | category, topic, tag |

In Excel, each sheet name is used as the category when a row does not set one. The first row must be the header.

**JSON** can be a list of word objects, `{ "words": [ ... ] }`, or `{ "phrasal verbs": [ { "word", "meaning" } ] }`.

Download a sample from the Sets screen, or use the files shipped with the app:

- `public/vocabulary-set-template.csv`
- `public/vocabulary-set-template.json`
- the Excel button builds `vocabulary-set-template.xlsx` in the app (CSV and JSON templates are produced with `json2csv` and the Excel template with `xlsx`)

Example CSV:

```csv
word,meaning,example,translation,category
give up,to stop trying,Do not give up when a new word feels hard.,bỏ cuộc,phrasal verbs
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Capacitor (Android and iOS shells around the same web build)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2d82c75f-fbf3-45fe-b388-9aeeec41c431) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
