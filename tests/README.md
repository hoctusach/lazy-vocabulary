# Tests

Run everything: `npm test` (Vitest). All suites should pass; a failure means a real regression.

| Area | Files |
| --- | --- |
| Word sets and import | `vocabularySetStore`, `parseVocabularyImport` |
| Input safety | `validation`, `sanitization`, `contentFilters` |
| Search | `normalizeQuery`, `vocabularySearchRanking`, `vocabularySheetOperations` |
| Progress and stats | `computeLearnedWordStats`, `LearningProgressPanel`, `markWordLearnedCapture`, `markWordReviewed`, `streak`, `leaderboard`, `nickname` |
| Time tracking | `dailyUsageTracker`, `learningTimeService`, `learningTimeTotalRoute` |
| Speech and playback | `speechText`, `speechSettings`, `voiceUtils`, `resolvePlaybackPreferences`, `localPreferencesStorage`, `realSpeechServiceMute`, `unifiedSpeechControllerMute`, `useSimpleVocabularyPlaybackMuteToggle`, `useVocabularyControlsVoiceToggle`, `useSpeechIntegrationVoiceChange`, `useAutoPlayResume`, `wordNavigationStop`, `useContentProcessor` |
| Data loading | `useVocabularyDataLoaderInitialWordsIndex`, `useVocabularyDataLoaderVoicePersistence` |
| Quiz, practice, reminders | `quizEngine`, `practiceRuleEngine`, `reminderMessages`, `fetchLatestMessage`, `parseWordAnnotations` |

## Known gaps (suites removed because they tested APIs that no longer exist)
Rewrite these against the current code when touching the area:
- Server daily selection and SRS (`learningProgressService`): selection, SRS state, new-words-by-category.
- Today list: due reviews included in the daily list, light/medium/hard daily option, today list construction.
- Data loader: next-allowed-time scheduling, loading all sheets.
- UI flows: mark word as new / removes today word / sound on learned, quick search view, voice toggle in the container.

## End-to-end (Android)
See `.maestro/README.md` (Maestro flows, Windows instructions).
