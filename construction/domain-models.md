# Enhanced Domain Models

## Decision: Using TypeScript Interfaces with Functional Approach
Based on existing codebase patterns, we'll use TypeScript interfaces for data models and functional services for behavior, maintaining consistency with current architecture.

## Enhanced Data Models

### Learning Progress Domain

```typescript
// Extended LearningProgress interface (Unit 1)
interface EnhancedLearningProgress extends LearningProgress {
  // Existing fields preserved
  word: string;
  type?: string;
  category: string;
  isLearned: boolean;
  reviewCount: number;
  lastPlayedDate: string;
  status: 'due' | 'not_due' | 'new';
  nextReviewDate: string;
  createdDate: string;
  
  // NEW: Intra-day timing fields
  exposuresToday: number;
  lastExposureTime: string;
  nextAllowedTime: string;
}

// Value objects for timing calculations
interface TimingDelay {
  exposureCount: number;
  delayMinutes: number;
  nextAllowedTime: string;
}

interface ExposureTracking {
  wordKey: string;
  exposuresToday: number;
  lastExposureTime: string;
  resetDate: string;
}
```

### Daily Scheduling Domain

```typescript
// Enhanced DailySelection interface (Unit 2)
interface EnhancedDailySelection extends DailySelection {
  // Existing fields preserved
  newWords: EnhancedLearningProgress[];
  reviewWords: EnhancedLearningProgress[];
  totalCount: number;
  
  // NEW: Category arrangement tracking
  categoryArrangement: CategoryArrangementInfo;
  persistenceInfo: PersistenceInfo;
}

interface CategoryArrangementInfo {
  originalOrder: string[];
  rearrangedOrder: string[];
  streaksFixed: number;
  maxConsecutiveCategory: number;
}

interface PersistenceInfo {
  sessionKey: string;
  persistentKey: string;
  generationDate: string;
  severity: SeverityLevel;
}

// Category distribution tracking
interface CategoryDistribution {
  category: string;
  targetCount: number;
  actualCount: number;
  weight: number;
}
```

### Playback Control Domain

```typescript
// Playback queue state (Unit 3)
interface PlaybackQueueState {
  todayList: EnhancedLearningProgress[];
  currentIndex: number;
  lastPlayedWords: string[]; // max 5 items
  isLooping: boolean;
  loopCount: number;
  queueId: string;
}

// Spacing rule enforcement
interface SpacingRule {
  type: 'FIVE_ITEM_GAP' | 'TIME_DELAY' | 'CATEGORY_LIMIT';
  isViolated: (word: EnhancedLearningProgress, state: PlaybackQueueState) => boolean;
  apply: (word: EnhancedLearningProgress, state: PlaybackQueueState) => boolean;
}

// Queue navigation
interface QueueNavigation {
  canAdvance: boolean;
  nextIndex: number;
  nextWord: EnhancedLearningProgress | null;
  skipReason?: string;
}
```

### Application Lifecycle Domain

```typescript
// App state management (Unit 4)
interface AppLifecycleState {
  isInitialized: boolean;
  currentDate: string;
  lastInitDate: string;
  hasDateChanged: boolean;
  initializationTimestamp: string;
}

// Integration coordination
interface SystemCoordination {
  learningProgressReady: boolean;
  dailySchedulerReady: boolean;
  playbackQueueReady: boolean;
  uiIntegrationReady: boolean;
}

// Progress statistics
interface ProgressStatistics {
  totalWords: number;
  learnedWords: number;
  newWords: number;
  dueWords: number;
  todayExposures: number;
  lastUpdated: string;
}
```

### User Interface Integration Domain

```typescript
// UI integration state (Unit 5)
interface UIIntegrationState {
  currentWord: EnhancedLearningProgress | null;
  isAudioPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  autoAdvanceEnabled: boolean;
}

// Button interaction tracking
interface ButtonInteraction {
  buttonType: 'NEXT' | 'PAUSE' | 'PLAY' | 'MUTE' | 'VOICE' | 'CATEGORY';
  timestamp: string;
  wordKey: string;
  resultingAction: string;
}

// Progress tracking for UI
interface UIProgressTracking {
  wordKey: string;
  actionType: 'MANUAL_ADVANCE' | 'AUTO_ADVANCE' | 'COMPLETION';
  timestamp: string;
  progressBefore: EnhancedLearningProgress;
  progressAfter: EnhancedLearningProgress;
}
```

## Aggregate Roots

### LearningProgressAggregate
- **Root Entity**: EnhancedLearningProgress
- **Responsibilities**: Manages word progress, exposure tracking, timing delays
- **Invariants**: exposuresToday >= 0, nextAllowedTime >= lastExposureTime

### DailySchedulingAggregate  
- **Root Entity**: EnhancedDailySelection
- **Responsibilities**: Manages daily word selection, category distribution
- **Invariants**: totalCount = newWords.length + reviewWords.length, no 3+ consecutive categories

### PlaybackQueueAggregate
- **Root Entity**: PlaybackQueueState
- **Responsibilities**: Manages queue navigation, spacing rules
- **Invariants**: currentIndex < todayList.length, lastPlayedWords.length <= 5

## Repository Interfaces

```typescript
interface LearningProgressRepository {
  getProgress(wordKey: string): Promise<EnhancedLearningProgress | null>;
  saveProgress(progress: EnhancedLearningProgress): Promise<void>;
  getAllProgress(): Promise<Map<string, EnhancedLearningProgress>>;
  migrateExistingData(): Promise<void>;
}

interface DailySelectionRepository {
  getTodaySelection(): Promise<EnhancedDailySelection | null>;
  saveSelection(selection: EnhancedDailySelection): Promise<void>;
  getHistoricalSelection(date: string): Promise<EnhancedDailySelection | null>;
}

interface PlaybackQueueRepository {
  getQueueState(): Promise<PlaybackQueueState | null>;
  saveQueueState(state: PlaybackQueueState): Promise<void>;
  clearQueue(): Promise<void>;
}
```