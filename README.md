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
