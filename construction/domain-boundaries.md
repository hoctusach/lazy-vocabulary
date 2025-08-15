# Domain Boundaries and Event Contracts

## Domain Contexts

### 1. Learning Progress Domain
**Responsibility**: Manages word learning progress, spaced repetition, and timing controls
**Bounded Context**: Individual word progress tracking and exposure management
**Key Entities**: LearningProgress, ExposureTracking, TimingDelay

### 2. Daily Scheduling Domain  
**Responsibility**: Generates and manages daily word selections with category distribution
**Bounded Context**: Daily list generation, category balancing, and persistence
**Key Entities**: DailySelection, CategoryDistribution, SchedulingRule

### 3. Playback Control Domain
**Responsibility**: Manages playback queue, auto-advance, and spacing rules
**Bounded Context**: Queue management, navigation, and playback flow
**Key Entities**: PlaybackQueue, QueueState, SpacingRule

### 4. Application Lifecycle Domain
**Responsibility**: Coordinates app startup, date changes, and cross-domain integration
**Bounded Context**: App initialization, lifecycle events, and system coordination
**Key Entities**: AppState, LifecycleEvent, SystemCoordinator

### 5. User Interface Integration Domain
**Responsibility**: Connects UI components with domain services without changing UI
**Bounded Context**: UI event handling, progress tracking, and component integration
**Key Entities**: UIIntegration, ButtonHandler, ProgressTracker

## Event Contracts

### Learning Progress Domain Events

```typescript
interface WordExposedEvent {
  type: 'WORD_EXPOSED';
  payload: {
    wordKey: string;
    exposureTime: string;
    exposureCount: number;
  };
}

interface ExposureCountResetEvent {
  type: 'EXPOSURE_COUNT_RESET';
  payload: {
    date: string;
    affectedWords: string[];
  };
}

interface TimingDelayCalculatedEvent {
  type: 'TIMING_DELAY_CALCULATED';
  payload: {
    wordKey: string;
    nextAllowedTime: string;
    delayMinutes: number;
  };
}
```

### Daily Scheduling Domain Events

```typescript
interface DailyListGeneratedEvent {
  type: 'DAILY_LIST_GENERATED';
  payload: {
    date: string;
    totalCount: number;
    newWordsCount: number;
    reviewWordsCount: number;
    severity: SeverityLevel;
  };
}

interface CategoryRearrangedEvent {
  type: 'CATEGORY_REARRANGED';
  payload: {
    originalOrder: string[];
    rearrangedOrder: string[];
    streaksFixed: number;
  };
}

interface ListPersistedEvent {
  type: 'LIST_PERSISTED';
  payload: {
    sessionKey: string;
    persistentKey: string;
    wordCount: number;
  };
}
```

### Playback Control Domain Events

```typescript
interface QueueInitializedEvent {
  type: 'QUEUE_INITIALIZED';
  payload: {
    queueLength: number;
    currentIndex: number;
  };
}

interface WordAdvancedEvent {
  type: 'WORD_ADVANCED';
  payload: {
    fromIndex: number;
    toIndex: number;
    wordKey: string;
    isAutoAdvance: boolean;
  };
}

interface LoopCompletedEvent {
  type: 'LOOP_COMPLETED';
  payload: {
    loopCount: number;
    queueLength: number;
  };
}

interface SpacingRuleAppliedEvent {
  type: 'SPACING_RULE_APPLIED';
  payload: {
    wordKey: string;
    ruleType: 'FIVE_ITEM_GAP' | 'TIME_DELAY';
    skipped: boolean;
  };
}
```

### Application Lifecycle Domain Events

```typescript
interface AppStartedEvent {
  type: 'APP_STARTED';
  payload: {
    timestamp: string;
    isFirstLoad: boolean;
  };
}

interface DateChangedEvent {
  type: 'DATE_CHANGED';
  payload: {
    previousDate: string;
    currentDate: string;
  };
}

interface ProgressUpdatedEvent {
  type: 'PROGRESS_UPDATED';
  payload: {
    wordKey: string;
    progressData: LearningProgress;
  };
}

interface StatsRefreshedEvent {
  type: 'STATS_REFRESHED';
  payload: {
    totalWords: number;
    learnedWords: number;
    newWords: number;
    dueWords: number;
  };
}
```

### User Interface Integration Domain Events

```typescript
interface ButtonClickedEvent {
  type: 'BUTTON_CLICKED';
  payload: {
    buttonType: 'NEXT' | 'PAUSE' | 'PLAY' | 'MUTE' | 'VOICE' | 'CATEGORY';
    wordKey: string;
  };
}

interface AudioCompletedEvent {
  type: 'AUDIO_COMPLETED';
  payload: {
    wordKey: string;
    completionTime: string;
    autoAdvance: boolean;
  };
}

interface ProgressTrackedEvent {
  type: 'PROGRESS_TRACKED';
  payload: {
    wordKey: string;
    actionType: 'MANUAL_ADVANCE' | 'AUTO_ADVANCE' | 'COMPLETION';
  };
}
```

## Event Flow Dependencies

```
Learning Progress Domain → Daily Scheduling Domain
Daily Scheduling Domain → Playback Control Domain  
Playback Control Domain → User Interface Integration Domain
Application Lifecycle Domain → All Domains
User Interface Integration Domain → Learning Progress Domain
```

## Integration Points with Existing Services

- **LearningProgressService**: Extended by Learning Progress Domain
- **VocabularyService**: Used by Daily Scheduling Domain
- **VocabularyCard**: Integrated by User Interface Integration Domain
- **LearningProgressPanel**: Updated by Application Lifecycle Domain