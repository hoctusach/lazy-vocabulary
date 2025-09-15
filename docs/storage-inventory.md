# Storage Inventory

This document lists all `localStorage` keys used in the repository as of this commit.

| Key | File path:line(s) | Purpose/Shape | Access | Bucket |
| --- | ----------------- | ------------- | ------ | ------ |
| `learningProgress` | `src/services/learningProgressService.ts:68,106,143,157,180,194`<br>`src/lib/sync/flushLocalToServer.ts:27,85` | Map of word key -> progress object `{status, reviewCount, ...}` | R/W | learnedWords / reviewQueue |
| `dailySelection` | `src/services/learningProgressService.ts:142-157,179-195,309` | Cached daily selection `{newWords[], reviewWords[], totalCount}` | R/W | reviewQueue |
| `lastSelectionDate` | `src/services/learningProgressService.ts:252,309-310,392-395` | ISO date of last generated selection | R/W | reviewQueue |
| `lazyVoca.nickname` | `src/components/NicknameGate.tsx:53,87`<br>`src/App.tsx:20`<br>`src/services/learningProgressService.ts:197` | Persisted nickname string | R/W | other/unrelated |
| `vocabularySettings` | `src/hooks/vocabulary-playback/useAudioControl.tsx:14-30`<br>`src/hooks/vocabulary-playback/useVoiceSelection.tsx:40-50,119-135,183-191` | JSON `{muted?, voiceIndex?}` | R/W | preferences |
| `preferredVoiceName` | `src/hooks/useVoiceContext.tsx:22,41,51`<br>`src/hooks/vocabulary-playback/useVoiceSelection.tsx:106-121,164-191` | Chosen TTS voice name | R/W | preferences |
| `vocabularySpeechRate` | `src/hooks/useSpeechRate.tsx:8,18`<br>`src/utils/speech/core/speechSettings.ts:45,56` | Number as string (speech rate) | R/W | preferences |
| `buttonStates` | `src/hooks/useMuteToggle.tsx:22-30`<br>`src/hooks/audio/useAudioMuteEffect.tsx:9-15`<br>`src/hooks/speech/useVoiceSettings.tsx:13-46`<br>`src/utils/text/contentFilters.ts:33` | Misc UI state `{muted?, pause?, voiceRegion?, ...}` | R/W | preferences / other |
| `speechUnlocked` | `src/utils/userInteraction.ts:5,13,20`<br>`src/hooks/vocabulary-playback/core/playback-states/useUserInteraction.ts:13-26`<br>`src/hooks/audio/useAudioCleanup.tsx:18,30` | Flag that user has interacted with audio | R/W | other/unrelated |
| other keys (`customWords`, `streakDays`, `stickers`, etc.) | various | Features unrelated to learning progress or preferences | R/W | other/unrelated |

## Bucket dependencies

### learnedWords / reviewQueue
- `LearningProgressService`
- `useLearningProgress`
- `VocabularyAppWithLearning`
- `LearningProgressPanel`
- `MarkAsLearnedDialog`
- `MarkAsNewDialog`

### preferences
- `useAudioControl`
- `useVoiceSelection`
- `useSpeechRate`
- `useMuteToggle`
- `useVoiceContext`
- `useAudioMuteEffect`
- `useVoiceSettings`

### other/unrelated
- `NicknameGate`
- `userInteraction` utilities
- `streak` utilities
- `StickerHistory`, `MedalCabinet`, etc.

