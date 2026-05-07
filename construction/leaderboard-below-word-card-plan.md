# Leaderboard Below Word Card Plan

## Goal

Add a compact leaderboard directly below the vocabulary word card so learners can compare progress without interrupting the existing playback controls or word-review flow.

## Current UI Anchors

- `VocabularyMainNew` owns the horizontal layout that places the word card in the main column and the controls column on the right.
- `VocabularyCardNew` renders only the word-card content and should stay focused on one word.
- `ContentWithDataNew` renders `VocabularyMainNew`, optional follow-up content, and the mobile speech note.

## Placement Strategy

1. Keep the word card and leaderboard in the same main content column.
2. Render the leaderboard immediately after `VocabularyCardNew` inside the `VocabularyMainNew` main-card wrapper.
3. Do not put leaderboard markup inside `VocabularyCardNew`; this avoids mixing single-word display concerns with cross-user progress ranking.
4. Keep the controls column aligned with the top of the card, not the leaderboard, so playback actions remain easy to reach.

## User Experience Requirements

- Show a concise title such as `Leaderboard` plus a timeframe control or label, starting with `Today`.
- Display the current learner's rank even when they are outside the visible top rows.
- Use a compact row layout: rank, nickname, learned-word count, and optional streak or minutes learned.
- Highlight the current learner row with the existing theme accent color.
- Support loading, empty, and signed-out states without shifting the word card vertically.
- On mobile, keep the leaderboard below the card and above the mobile speech note.

## Data Model

Start with a read-only leaderboard view model so the UI can be built before the backend source is finalized:

```ts
interface LeaderboardEntry {
  userKey: string;
  nickname: string;
  rank: number;
  learnedWords: number;
  streakDays?: number;
  learningMinutes?: number;
  isCurrentUser?: boolean;
}

interface LeaderboardState {
  timeframe: 'today' | 'week' | 'allTime';
  entries: LeaderboardEntry[];
  currentUserEntry?: LeaderboardEntry;
  isLoading: boolean;
  error?: string;
}
```

## Data Source Plan

1. Prefer server-backed aggregate data so rankings are consistent across devices.
2. Reuse the existing user identity key used by progress sync and nickname storage.
3. Aggregate from learned-word progress first because the app already tracks learned-word counts.
4. Add a server endpoint or database query that returns only leaderboard-safe fields: rank, nickname, and aggregate counts.
5. Avoid exposing email, raw profile IDs, or full vocabulary details in leaderboard responses.
6. Cache results briefly in memory or React Query to avoid re-fetching on every word transition.

## Component Plan

1. Create `src/components/vocabulary-app/LeaderboardPanel.tsx`.
2. Add a small service/query helper, for example `src/lib/progress/leaderboard.ts`, that returns `LeaderboardState` or raw entries.
3. Import `LeaderboardPanel` in `VocabularyMainNew` and render it below `VocabularyCardNew`.
4. Pass only data needed by the panel; keep fetching either inside a hook (`useLeaderboard`) or in the container layer if server auth context is needed.
5. Keep the first version read-only; defer interactions like timeframe tabs until the data contract is stable.

## Styling Plan

- Use the same card surface, border, rounded corners, and muted text classes already used by the vocabulary UI.
- Set `max-w-2xl mx-auto` so leaderboard width matches the word card.
- Add `mt-3` or `mt-4` spacing below the card.
- Keep row height small enough to show the top 5 users without pushing mobile notes far down.
- Ensure color contrast works in all themes by relying on CSS variables and existing theme utility classes.

## Implementation Phases

### Phase 1: Static UI Skeleton

- Add `LeaderboardPanel` with sample props and all visual states.
- Render it below the word card using mock data passed from `VocabularyMainNew`.
- Verify desktop and mobile layout spacing.

### Phase 2: Local Data Integration

- Derive a current-user placeholder row from existing learned-word statistics.
- Show an empty-state message when there is no leaderboard source yet.
- Confirm the word card, controls, speech note, and debug panel order remain unchanged.

### Phase 3: Server Data Integration

- Implement the leaderboard query/helper against the selected server endpoint or Supabase view.
- Add loading and error handling.
- Include privacy safeguards so only display-safe fields are returned.

### Phase 4: Ranking Enhancements

- Add timeframe support: today, week, and all time.
- Add current-user fallback row when outside the top list.
- Add lightweight refresh behavior after a word is marked learned.

### Phase 5: QA and Hardening

- Add component tests for loading, empty, error, top-entry, and current-user-highlight states.
- Add integration coverage that confirms the panel renders below the word card.
- Test responsive behavior at mobile, tablet, and desktop widths.
- Test signed-out and missing-nickname scenarios.

## Acceptance Criteria

- The leaderboard appears immediately below the word card and above any existing post-card content.
- The word card remains visually unchanged.
- Playback controls remain in the right-side controls column.
- The current user can identify their own ranking.
- No private user data is rendered or returned by the leaderboard data layer.
- The app continues to build successfully after the leaderboard files are added.
