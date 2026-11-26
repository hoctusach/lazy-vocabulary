# Test report

- Date: 2026-11-26
- Commit: 4a71a929
- Device: none (e2e not executed)

## 1. Unit and component tests (Vitest)

Files: 38/38 passed. Tests: 122/122 passed, 0 failed.

| File | Tests | Result |
| --- | ---: | --- |
| computeLearnedWordStats.test.ts | 3 | PASS |
| contentFilters.test.ts | 2 | PASS |
| dailyUsageTracker.test.ts | 2 | PASS |
| fetchLatestMessage.test.ts | 3 | PASS |
| leaderboard.test.ts | 3 | PASS |
| LearningProgressPanel.test.tsx | 3 | PASS |
| learningTimeService.test.ts | 1 | PASS |
| learningTimeTotalRoute.test.ts | 1 | PASS |
| localPreferencesStorage.test.ts | 3 | PASS |
| markWordLearnedCapture.test.tsx | 1 | PASS |
| markWordReviewed.test.ts | 1 | PASS |
| nickname.test.ts | 2 | PASS |
| normalizeQuery.test.ts | 5 | PASS |
| parseVocabularyImport.test.ts | 11 | PASS |
| parseWordAnnotations.test.ts | 3 | PASS |
| practiceRuleEngine.test.ts | 2 | PASS |
| quizEngine.test.ts | 11 | PASS |
| realSpeechServiceMute.test.ts | 1 | PASS |
| reminderMessages.test.ts | 4 | PASS |
| resolvePlaybackPreferences.test.ts | 2 | PASS |
| sanitization.test.ts | 3 | PASS |
| speechSettings.test.ts | 5 | PASS |
| speechText.test.ts | 7 | PASS |
| streak.test.ts | 7 | PASS |
| unifiedSpeechControllerMute.test.ts | 2 | PASS |
| useAutoPlayResume.test.ts | 3 | PASS |
| useContentProcessor.test.ts | 1 | PASS |
| useSimpleVocabularyPlaybackMuteToggle.test.ts | 1 | PASS |
| useSpeechIntegrationVoiceChange.test.ts | 1 | PASS |
| useVocabularyControlsVoiceToggle.test.ts | 1 | PASS |
| useVocabularyDataLoaderInitialWordsIndex.test.ts | 2 | PASS |
| useVocabularyDataLoaderVoicePersistence.test.ts | 1 | PASS |
| validation.test.ts | 10 | PASS |
| vocabularySearchRanking.test.ts | 3 | PASS |
| vocabularySetStore.test.ts | 6 | PASS |
| vocabularySheetOperations.test.ts | 2 | PASS |
| voiceUtils.test.ts | 2 | PASS |
| wordNavigationStop.test.tsx | 1 | PASS |

## 2. End-to-end tests (Maestro, Android)

PASS 0 / FAIL 0 / SKIPPED 0 / NOT RUN 33 of 33 cases.

| # | Case | Tags | Result | Notes |
| ---: | --- | --- | --- | --- |
| 1 | Cold start shows a word card | smoke, regression | NOT RUN |  |
| 2 | Bottom tabs open the right screens | smoke | NOT RUN |  |
| 3 | New user can create a profile and enter the app | smoke | NOT RUN |  |
| 4 | Card shows word, meaning and example | smoke | NOT RUN |  |
| 5 | Next Word changes the word | smoke | NOT RUN |  |
| 6 | Pause and Play switch state | regression | NOT RUN |  |
| 7 | Mute and Unmute switch state | regression | NOT RUN |  |
| 8 | Change Voice is available and tappable | regression | NOT RUN |  |
| 9 | Mark as Learned confirms and removes the word | smoke | NOT RUN |  |
| 10 | Quick Search finds a word | regression | NOT RUN |  |
| 11 | Progress shows learned / learning / new / due numbers | smoke | NOT RUN |  |
| 12 | Words Today lists New / Due / Learned | regression | NOT RUN |  |
| 13 | Quick Quiz: 5 questions then a score | regression | NOT RUN |  |
| 14 | Streak panel is visible | regression | NOT RUN |  |
| 15 | Leaderboard shows (needs network) | regression | NOT RUN |  |
| 16 | Only Default set, no Rename/Delete for it | smoke | NOT RUN |  |
| 17 | CSV template opens the share sheet | regression | NOT RUN |  |
| 18 | Import a valid CSV | smoke | NOT RUN |  |
| 19 | Invalid file shows an error and creates no set | regression | NOT RUN |  |
| 20 | Import Excel and JSON | regression | NOT RUN |  |
| 21 | Switching sets changes the card | smoke | NOT RUN |  |
| 22 | Rename set validates the name | regression | NOT RUN |  |
| 23 | Delete set returns to Default | regression | NOT RUN |  |
| 24 | Progress is separate per set | regression | NOT RUN |  |
| 25 | More: theme and reminders | regression | NOT RUN |  |
| 26 | Relaunch restores set, word, mute and last-used voice | smoke | NOT RUN |  |
| 27 | Imported set works offline | regression | NOT RUN |  |
| 28 | Tab bar does not cover content on a small screen | regression | NOT RUN |  |
| 29 | First open of the day builds the daily word list (follows main) | smoke | NOT RUN |  |
| 30 | Lock screen shows the word and keeps reading (pending merge) | smoke, pending | NOT RUN |  |
| 31 | Notification shows the word and keeps reading (pending merge) | smoke, pending | NOT RUN |  |
| 32 | Notification Pause / Next / Stop work (pending merge) | regression, pending | NOT RUN |  |
| 33 | Reopening resumes the word read in the background (pending merge) | regression, pending | NOT RUN |  |

Cases tagged `pending` need the background-playback branch merged into main.
