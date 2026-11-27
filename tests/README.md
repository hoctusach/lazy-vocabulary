# Tests

Run everything: `npm test` (Vitest). All suites should pass; a failure means a real regression.

| Area | Files |
| --- | --- |
| Word sets and import | `vocabularySetStore`, `parseVocabularyImport`, `importEdge`, `setStoreEdge` |
| Input safety | `validation`, `sanitization`, `contentFilters`, `securityEdge` |
| Login | `AuthGate` (screen), `edgeFunctions` (Supabase Edge Functions), `nicknameRules` |
| Spaced repetition and stats | `srsScheduling`, `learnedWordStatsEdge`, `streakTimezone` |
| Storage helpers | `storageHelpers` (last word, word counts, learning time, preferences) |
| Reminders | `dailyReminder` |
| Built-in data | `defaultDataIntegrity` |
| UI pieces | `dialogsAndCard` |
| Search | `normalizeQuery`, `vocabularySearchRanking`, `vocabularySheetOperations`, `searchEdge` |
| Progress and stats | `computeLearnedWordStats`, `LearningProgressPanel`, `markWordLearnedCapture`, `markWordReviewed`, `streak`, `leaderboard`, `nickname` |
| Time tracking | `dailyUsageTracker`, `learningTimeService`, `learningTimeTotalRoute` |
| Speech and playback | `speechText`, `speechSettings`, `voiceUtils`, `resolvePlaybackPreferences`, `localPreferencesStorage`, `realSpeechServiceMute`, `unifiedSpeechControllerMute`, `useSimpleVocabularyPlaybackMuteToggle`, `useVocabularyControlsVoiceToggle`, `useSpeechIntegrationVoiceChange`, `useAutoPlayResume`, `wordNavigationStop`, `useContentProcessor`, `practiceEngine` |
| Data loading | `useVocabularyDataLoaderInitialWordsIndex`, `useVocabularyDataLoaderVoicePersistence` |
| Quiz, practice, reminders | `quizEngine`, `practiceRuleEngine`, `reminderMessages`, `fetchLatestMessage`, `parseWordAnnotations` |

## Known gaps (suites removed because they tested APIs that no longer exist)
Rewrite these against the current code when touching the area:
- Server daily selection (`fetchAndCommitTodaySelection`, `generate_daily_selection_v2`): selection, new-words-by-category. The review schedule itself is covered by `srsScheduling`.
- Today list: due reviews included in the daily list, light/medium/hard daily option, today list construction.
- Data loader: next-allowed-time scheduling, loading all sheets.
- UI flows: mark word as new / removes today word / sound on learned, quick search view, voice toggle in the container.

## Known bugs are tests too
A test written with `it.fails` describes the correct behaviour of a known bug: it passes while the bug exists and fails once the bug is fixed (then change `it.fails` to `it`). Two are left: repeated words in the built-in data (#7) and `null` preferences (#17). The list with fixes and status is in `tests/KNOWN-ISSUES.md`.
