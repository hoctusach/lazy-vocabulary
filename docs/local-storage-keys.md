# Local Storage Keys

This document catalogs all `localStorage` keys used by Lazy Vocabulary and outlines the structure of the data stored for each key.  The goal is to make future migrations or schema changes easier.

| Key / Pattern | Structure | Purpose |
|---|---|---|
| `vocabularyData` | [`SheetData`](../src/types/vocabulary.ts): object whose keys are category names and values are arrays of `VocabularyWord` objects | Main vocabulary dataset persisted between sessions |
| `lastUploadedVocabulary` | same as `vocabularyData` | Snapshot of the last uploaded vocabulary file |
| `learningProgress` | object mapping unique word identifiers to [`LearningProgress`](../src/types/learning.ts) objects | Spaced‑repetition progress for each word |
| `dailySelection` | [`DailySelection`](../src/types/learning.ts) | Cached list of words chosen for the current day |
| `lastSelectionDate` | ISO date string (`YYYY‑MM‑DD`) | Date when `dailySelection` was generated |
| `learningTime_<learnerId>` | object `{ [date: string]: number }` | Daily learning time in milliseconds per learner |
| `buttonStates` | object with UI flags such as `currentCategory`, `isMuted`, `isPaused`, `voiceRegion` (`'US' | 'UK' | 'AU'`) and `preserveSpecial` | Persists assorted UI toggle states |
| `vocabularySpeechRate` | stringified number | Saved speech playback rate |
| `preferredVoiceName` | string | Selected speech synthesis voice |
| `translationLang` | string | Two‑letter language code for word translations |
| `vocabularySettings` | object with fields like `voiceIndex` (number) and `muted` (boolean) | Legacy storage for playback settings |
| `voiceSettings` | *(unused placeholder)* | Reserved for future voice options |
| `stickers` | `string[]` of ISO dates | Dates when a sticker/learning day was earned |
| `streakDays` | `string[]` of ISO dates | Logged consecutive learning days |
| `usedStreakDays` | `string[]` of ISO dates | Streak days already used to redeem badges |
| `badges` | `{ [badgeId: string]: boolean }` | Earned badge flags |
| `redeemableStreaks` | `{ [badgeId: string]: string[] }` | Streak badges awaiting redemption and their qualifying dates |
| `medalRedemptions` | `{ [medalId: string]: string }` | Records redeemed medal messages |
| `learningTime_*` | see `learningTime_<learnerId>` above | Alias prefix for learning‑time records |
| `currentDisplayedWord` | string | Debug/diagnostics: last word shown in the UI |
| `currentTextBeingSpoken` | string | Debug/diagnostics: last speech text sent to the synthesiser |
| `speechUnlocked` | `'true' | 'false'` | Indicates whether user interaction has enabled audio playback |
| `deviceId` | string | Anonymous identifier used by session tracker |
| `pushSubscription` | PushSubscription JSON | Stored web push subscription |
| `lazyVoca.lastWordByCategory` | `{ [category: string]: string }` | Last displayed word for each category |
| `lazyVoca.todayLastWord` | `{ date: string; index: number; word: string; category?: string }` | Last word shown today along with its index |
| `customWords` | Array of word objects (legacy) | Backward‑compatibility storage for user‑added words |
| *category name* (e.g. `"All words"`, `"idioms"`) | `VocabularyWord[]` | Legacy per‑category word lists |
| `vocabulary-word-counts` | `{ [wordKey: string]: { word: string; count: number; lastShown: string } }` | Tracks how often each word has been displayed |

## Notes

* All JSON structures are stored using `JSON.stringify` and must be parsed when retrieved.
* Some keys (like category names or `learningTime_<learnerId>`) are dynamically generated but follow the patterns listed above.
