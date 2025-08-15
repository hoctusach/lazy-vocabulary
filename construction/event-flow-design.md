# Event Flow Design

## Event Bus Architecture

### Simple Observer Pattern Implementation
Based on existing codebase patterns, we'll use a lightweight observer pattern with TypeScript for event-driven communication.

```typescript
// Event bus implementation
class EventBus {
  private listeners: Map<string, Function[]> = new Map();
  
  subscribe<T>(eventType: string, handler: (event: T) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(handler);
  }
  
  unsubscribe(eventType: string, handler: Function): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  publish<T>(event: { type: string; payload: T }): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error handling event ${event.type}:`, error);
        }
      });
    }
  }
}

// Singleton event bus
export const eventBus = new EventBus();
```

## Event Flow Diagrams

### 1. App Startup Flow

```
App Start
    ↓
AppStartedEvent → LearningProgressIntegrator
    ↓
Check Date Change
    ↓
DateChangedEvent → All Units (if date changed)
    ↓
Initialize Learning Progress
    ↓
Generate Daily Selection
    ↓
DailyListGeneratedEvent → PlaybackQueueService
    ↓
Initialize Playback Queue
    ↓
QueueInitializedEvent → UIIntegrationService
    ↓
Connect UI Handlers
    ↓
App Ready
```

### 2. Word Playback Flow

```
User Clicks Next / Auto-Advance
    ↓
ButtonClickedEvent → PlaybackIntegrationService
    ↓
Queue Navigation Check
    ↓
WordAdvancedEvent → All Subscribers
    ↓
Audio Playback Starts
    ↓
Audio Completes
    ↓
AudioCompletedEvent → Multiple Handlers
    ├─ Update Word Progress → ProgressUpdatedEvent
    ├─ Update Exposure Count → WordExposedEvent
    └─ Auto-Advance (if enabled) → WordAdvancedEvent
```

### 3. Daily Reset Flow

```
Date Change Detected
    ↓
DateChangedEvent → LearningProgressIntegrator
    ↓
Reset Daily Exposures
    ↓
ExposureCountResetEvent → All Subscribers
    ↓
Generate New Daily Selection
    ↓
DailyListGeneratedEvent → PlaybackQueueService
    ↓
Reinitialize Queue
    ↓
QueueInitializedEvent → UIIntegrationService
    ↓
Refresh Progress Stats
    ↓
StatsRefreshedEvent → LearningProgressPanel
```

## Event Handlers by Unit

### Unit 1: Enhanced Spaced Repetition Engine

```typescript
class LearningProgressEventHandlers {
  constructor(private service: EnhancedLearningProgressService) {
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // Handle audio completion for exposure tracking
    eventBus.subscribe<AudioCompletedEvent>('AUDIO_COMPLETED', (event) => {
      this.service.updateWordExposure(event.payload.wordKey);
    });
    
    // Handle date changes for daily reset
    eventBus.subscribe<DateChangedEvent>('DATE_CHANGED', (event) => {
      this.service.resetDailyExposures();
    });
    
    // Handle app start for data migration
    eventBus.subscribe<AppStartedEvent>('APP_STARTED', (event) => {
      this.service.migrateExistingData();
    });
  }
  
  // Publish events
  publishWordExposed(wordKey: string, exposureCount: number): void {
    eventBus.publish({
      type: 'WORD_EXPOSED',
      payload: { wordKey, exposureTime: new Date().toISOString(), exposureCount }
    });
  }
  
  publishTimingDelayCalculated(wordKey: string, nextAllowedTime: string, delayMinutes: number): void {
    eventBus.publish({
      type: 'TIMING_DELAY_CALCULATED',
      payload: { wordKey, nextAllowedTime, delayMinutes }
    });
  }
}
```

### Unit 2: Daily Learning Scheduler Enhancement

```typescript
class DailySchedulerEventHandlers {
  constructor(private service: EnhancedDailyScheduler) {
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // Handle date changes for new daily selection
    eventBus.subscribe<DateChangedEvent>('DATE_CHANGED', (event) => {
      this.generateNewDailySelection();
    });
    
    // Handle app start for daily selection check
    eventBus.subscribe<AppStartedEvent>('APP_STARTED', (event) => {
      this.checkAndGenerateDailySelection();
    });
  }
  
  // Publish events
  publishDailyListGenerated(selection: EnhancedDailySelection): void {
    eventBus.publish({
      type: 'DAILY_LIST_GENERATED',
      payload: {
        date: selection.persistenceInfo.generationDate,
        totalCount: selection.totalCount,
        newWordsCount: selection.newWords.length,
        reviewWordsCount: selection.reviewWords.length,
        severity: selection.persistenceInfo.severity
      }
    });
  }
  
  publishCategoryRearranged(arrangement: CategoryArrangementInfo): void {
    eventBus.publish({
      type: 'CATEGORY_REARRANGED',
      payload: arrangement
    });
  }
}
```

### Unit 3: Playback Queue Management

```typescript
class PlaybackQueueEventHandlers {
  constructor(private service: PlaybackQueueService) {
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // Handle daily list generation for queue initialization
    eventBus.subscribe<DailyListGeneratedEvent>('DAILY_LIST_GENERATED', (event) => {
      this.initializeQueueFromDailySelection();
    });
    
    // Handle audio completion for auto-advance
    eventBus.subscribe<AudioCompletedEvent>('AUDIO_COMPLETED', (event) => {
      if (event.payload.autoAdvance) {
        this.service.advanceToNext(true);
      }
    });
    
    // Handle button clicks for manual navigation
    eventBus.subscribe<ButtonClickedEvent>('BUTTON_CLICKED', (event) => {
      if (event.payload.buttonType === 'NEXT') {
        this.service.advanceToNext(false);
      }
    });
  }
  
  // Publish events
  publishWordAdvanced(fromIndex: number, toIndex: number, wordKey: string, isAutoAdvance: boolean): void {
    eventBus.publish({
      type: 'WORD_ADVANCED',
      payload: { fromIndex, toIndex, wordKey, isAutoAdvance }
    });
  }
  
  publishQueueInitialized(queueLength: number, currentIndex: number): void {
    eventBus.publish({
      type: 'QUEUE_INITIALIZED',
      payload: { queueLength, currentIndex }
    });
  }
}
```

### Unit 4: Learning Progress Integration

```typescript
class IntegrationEventHandlers {
  constructor(private integrator: LearningProgressIntegrator) {
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // Handle word advancement for progress updates
    eventBus.subscribe<WordAdvancedEvent>('WORD_ADVANCED', (event) => {
      this.integrator.updateWordProgress(
        event.payload.wordKey,
        event.payload.isAutoAdvance ? 'AUTO_ADVANCE' : 'MANUAL_ADVANCE'
      );
    });
    
    // Handle audio completion for progress updates
    eventBus.subscribe<AudioCompletedEvent>('AUDIO_COMPLETED', (event) => {
      this.integrator.updateWordProgress(event.payload.wordKey, 'COMPLETION');
    });
    
    // Handle progress updates for stats refresh
    eventBus.subscribe<ProgressUpdatedEvent>('PROGRESS_UPDATED', (event) => {
      this.integrator.refreshProgressStats();
    });
  }
  
  // Publish events
  publishAppStarted(timestamp: string, isFirstLoad: boolean): void {
    eventBus.publish({
      type: 'APP_STARTED',
      payload: { timestamp, isFirstLoad }
    });
  }
  
  publishDateChanged(previousDate: string, currentDate: string): void {
    eventBus.publish({
      type: 'DATE_CHANGED',
      payload: { previousDate, currentDate }
    });
  }
}
```

### Unit 5: Playback Integration Layer

```typescript
class UIIntegrationEventHandlers {
  constructor(private service: PlaybackIntegrationService) {
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // Handle queue initialization for UI sync
    eventBus.subscribe<QueueInitializedEvent>('QUEUE_INITIALIZED', (event) => {
      this.service.syncWithQueue();
    });
    
    // Handle word advancement for UI updates
    eventBus.subscribe<WordAdvancedEvent>('WORD_ADVANCED', (event) => {
      this.service.updateCurrentWord(event.payload.wordKey);
    });
    
    // Handle spacing rule violations for user feedback
    eventBus.subscribe<SpacingRuleAppliedEvent>('SPACING_RULE_APPLIED', (event) => {
      if (event.payload.skipped) {
        this.service.showAdvanceBlockedFeedback(event.payload.ruleType);
      }
    });
  }
  
  // Publish events
  publishButtonClicked(buttonType: string, wordKey: string): void {
    eventBus.publish({
      type: 'BUTTON_CLICKED',
      payload: {
        buttonType,
        timestamp: new Date().toISOString(),
        wordKey
      }
    });
  }
  
  publishAudioCompleted(wordKey: string, autoAdvance: boolean): void {
    eventBus.publish({
      type: 'AUDIO_COMPLETED',
      payload: {
        wordKey,
        completionTime: new Date().toISOString(),
        autoAdvance
      }
    });
  }
}
```

## Event Dependencies Map

```typescript
const eventDependencies = {
  'APP_STARTED': ['Unit4'],
  'DATE_CHANGED': ['Unit4'],
  'WORD_EXPOSED': ['Unit1'],
  'EXPOSURE_COUNT_RESET': ['Unit1'],
  'TIMING_DELAY_CALCULATED': ['Unit1'],
  'DAILY_LIST_GENERATED': ['Unit2'],
  'CATEGORY_REARRANGED': ['Unit2'],
  'LIST_PERSISTED': ['Unit2'],
  'QUEUE_INITIALIZED': ['Unit3'],
  'WORD_ADVANCED': ['Unit3'],
  'LOOP_COMPLETED': ['Unit3'],
  'SPACING_RULE_APPLIED': ['Unit3'],
  'PROGRESS_UPDATED': ['Unit4'],
  'STATS_REFRESHED': ['Unit4'],
  'BUTTON_CLICKED': ['Unit5'],
  'AUDIO_COMPLETED': ['Unit5'],
  'PROGRESS_TRACKED': ['Unit5']
};

const eventSubscribers = {
  'Unit1': ['AUDIO_COMPLETED', 'DATE_CHANGED', 'APP_STARTED'],
  'Unit2': ['DATE_CHANGED', 'APP_STARTED'],
  'Unit3': ['DAILY_LIST_GENERATED', 'AUDIO_COMPLETED', 'BUTTON_CLICKED'],
  'Unit4': ['WORD_ADVANCED', 'AUDIO_COMPLETED', 'PROGRESS_UPDATED'],
  'Unit5': ['QUEUE_INITIALIZED', 'WORD_ADVANCED', 'SPACING_RULE_APPLIED']
};
```

## Error Handling in Event Flow

```typescript
class EventErrorHandler {
  static handleEventError(eventType: string, error: Error, payload: any): void {
    console.error(`Event handling error for ${eventType}:`, error);
    
    // Log error details
    this.logEventError(eventType, error, payload);
    
    // Attempt recovery based on event type
    this.attemptEventRecovery(eventType, payload);
  }
  
  private static attemptEventRecovery(eventType: string, payload: any): void {
    switch (eventType) {
      case 'AUDIO_COMPLETED':
        // Ensure progress is still updated even if auto-advance fails
        this.fallbackProgressUpdate(payload.wordKey);
        break;
      case 'WORD_ADVANCED':
        // Ensure UI state is consistent
        this.fallbackUISync();
        break;
      case 'DAILY_LIST_GENERATED':
        // Ensure queue is initialized even if event handling fails
        this.fallbackQueueInit();
        break;
    }
  }
}
```

## Performance Considerations

### Event Batching
```typescript
class EventBatcher {
  private batchedEvents: Map<string, any[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  
  batchEvent(eventType: string, payload: any): void {
    if (!this.batchedEvents.has(eventType)) {
      this.batchedEvents.set(eventType, []);
    }
    
    this.batchedEvents.get(eventType)!.push(payload);
    
    // Schedule batch processing
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatchedEvents();
      }, 100); // 100ms batch window
    }
  }
  
  private processBatchedEvents(): void {
    this.batchedEvents.forEach((payloads, eventType) => {
      eventBus.publish({
        type: `${eventType}_BATCH`,
        payload: payloads
      });
    });
    
    this.batchedEvents.clear();
    this.batchTimeout = null;
  }
}
```