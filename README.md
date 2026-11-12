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

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2d82c75f-fbf3-45fe-b388-9aeeec41c431) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Mobile apps (Android and iOS)

The website stays a normal Vite app. The same production build is wrapped with [Capacitor](https://capacitorjs.com/) (free) for Android and iOS. Capacitor serves that build inside a WebView from `https://localhost`, so the phone app is the website plus native status bar, splash screen, file sharing, and text-to-speech where the WebView cannot speak.

`lovable-tagger` is imported only when Vite's mode is `development` (`vite.config.ts`). Production builds, including the one copied into the native projects, do not include it.

### Where data lives

Vocabulary files already lived on the device (`localStorage`), and Supabase stores the account, leaderboard, and spaced-repetition progress for the built-in catalog. Imported sets are files the server has never seen, so they cannot use that server review queue. Each set, and the learned / learning progress for that set, is stored on the device. The WebView keeps `localStorage`, so it survives restarts. The Default set still uses the existing Supabase review flow. Progress does not move with you to another phone until you import the file there again.

Sign-in is a nickname and passcode kept in `localStorage`. The Supabase client does not read OAuth tokens from the URL (`detectSessionInUrl: false`), so no redirect URL is required. The app still registers the custom scheme `com.lazy.vocabulary://auth` if a redirect is added later.

On iOS, speech uses the device text-to-speech engine because WebKit's `speechSynthesis` often stays silent. Android and desktop browsers keep the Web Speech API. A download that the WebView would ignore (the sample template) is handed to the system share sheet instead.

The native shell uses hash routes (`/#/vocabulary/...`) so a reload does not ask the WebView for a file that does not exist. The website keeps normal paths (`/vocabulary/...`).

### Run on an Android phone or emulator

You need Node.js 18+, Android Studio (or the Android SDK), and a USB debugging-enabled phone or an emulator.

```sh
npm install
npm run build
npx cap sync
```

`npm run build` writes the site to `docs/`. `npx cap sync` copies it into `android/` and `ios/`. `npm run build:mobile` does both.

Then either:

```sh
npm run cap:open:android
```

or, from the project root:

```sh
cd android
./gradlew assembleDebug
```

Android Studio: open the `android` folder, wait for Gradle, then Run. The debug APK is:

`android/app/build/outputs/apk/debug/app-debug.apk`

Copy that file to a phone and install it, or use Android Studio's device picker. The first launch needs a network connection if you sign in and load the Default set's server reviews. Imported sets work offline after they are saved.

### Run on iOS

iOS builds need a Mac with Xcode. This repository includes the `ios/` project, but a Linux or Windows machine cannot compile it.

```sh
npm install
npm run build
npx cap sync
npm run cap:open:ios
```

In Xcode, pick your team under Signing & Capabilities, choose a simulator or a connected iPhone, and press Run. The first time you practice out loud, iOS asks for the microphone and speech-recognition permission.

### Release APK and AAB

1. In Android Studio, Build > Generate Signed Bundle / APK.
2. Create a keystore and keep the passwords. They are not in this repo. You need the same keystore for every future update.
3. Choose **Android App Bundle** (`.aab`) for Play Store, or **APK** if you are installing the file yourself.
4. Play Console also needs a developer account. Create the app there and upload the `.aab`.

A debug APK from `assembleDebug` is only for testing. It is signed with the debug key and is not what you upload to the store.

### Import file format

On the Sets tab, choose a `.csv`, `.xlsx`, `.xls`, or `.json` file (10 MB or fewer, up to 20,000 words). The file picker is the system picker inside the WebView.

The first row of a spreadsheet is the header. These names are accepted (any mix of case):

| Column | Required | Also accepted |
| --- | --- | --- |
| word | yes | term, vocabulary, phrase, expression, english |
| meaning | recommended | definition, gloss |
| example | no | examples, sentence, usage, sample |
| category | no | sheet, topic, group, type, tag |
| translation | no | vietnamese, meaning_vi |
| count | no | views, frequency |

If there is no category column, each Excel sheet becomes a category. A sheet named `Sheet1` is stored as `Imported`. Semicolons are fine when the file uses `;` instead of commas.

JSON can be a list:

```json
[{ "word": "keen", "meaning": "eager", "example": "She is keen to start.", "category": "academic" }]
```

or categories mapped to lists: `{ "travel": [ { "word": "gate", "meaning": "airport exit" } ] }`.

Download a template from the Sets screen, or open `/samples/vocabulary-template.csv` and `/samples/vocabulary-template.json`.

The built-in list is the set named **Default**. You can rename or delete sets you imported. Default cannot be deleted or renamed. Switching sets changes the words you study, and learned words stay with the set you marked them in.

