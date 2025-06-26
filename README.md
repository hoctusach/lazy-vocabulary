# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2d82c75f-fbf3-45fe-b388-9aeeec41c431

## Setup

This project requires **Node.js >=18**. A `.nvmrc` file is provided so you can
quickly switch to the correct version with
[`nvm`](https://github.com/nvm-sh/nvm#installing-and-updating):

```sh
nvm install
nvm use
```

After cloning the repository, install dependencies before running or building
the project:

```sh
npm install
```

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

The controls panel includes a **Change Voice Variant** button (speaker icon) that cycles the voice used for speech playback.
Available variants are grouped by region:

- **US:** `en-US-Standard-G`
- **UK:** `Google UK English Female`, `Daniel`, `Kate`, `Susan`, `Hazel`
- **AU:** `en-AU-Standard-C`, `Google AU English Male`, `Google AU English Female`, `Karen`, `Catherine`

Your last selection is stored in `localStorage` under the `vocabularySettings` key so the chosen voice persists between sessions.

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
