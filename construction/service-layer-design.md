# Service Layer Design

## Service Architecture Overview

### Functional Approach with TypeScript Interfaces
Following existing codebase patterns, we'll use functional services with clear interfaces and dependency injection.

## Service Interfaces by Domain

### 1. Learning Progress Domain Services

```typescript
// Core learning progress service interface
interface IEnhancedLearningProgressService {
  // Existing methods (preserved)
  initializeWord(word: VocabularyWord): EnhancedLearningProgress;
  updateWordProgress(wordKey: string): Promise<void>;
  updateWordStatuses(): Promise<void>;
  getWordProgress(wordKey: string): Promise<EnhancedLearningProgress | null>;
  getProgressStats(): ProgressStatistics;
  
  // NEW: Enhanced timing methods
  updateWordExposure(wordKey: string): Promise<void>;
  calculateNextAllowedTime(exposureCount: number, lastExposureTime: string): string;
  resetDailyExposures(): Promise<void>;
  isWordEligibleForPlay(wordKey: string): Promise<boolean>;
  migrateExistingData(): Promise<void>;
}

// Timing calculation service
interface ITimingCalculatorService {
  calculateDelay(exposureCount: number): number;
  addMinutes(timestamp: string, minutes: number): string;
  isTimeElapsed(targetTime: string): boolean;
  getCurrentTimestamp(): string;
}

// Daily reset service
interface IDailyResetService {
  checkAndResetIfNewDay(): Promise<boolean>;
  resetAllExposureCounts(): Promise<void>;
  getLastResetDate(): string;
  setLastResetDate(date: string): void;
}
```

### 2. Daily Scheduling Domain Services

```typescript
// Enhanced daily scheduler service
interface IEnhancedDailySchedulerService {
  // Existing methods (preserved)
  generateDailySelection(allWords: VocabularyWord[], severity: SeverityLevel): Promise<EnhancedDailySelection>;
  getTodaySelection(): Promise<EnhancedDailySelection | null>;
  
  // NEW: Enhanced methods
  rearrangeByCategory(words: EnhancedLearningProgress[]): Promise<{
    rearranged: EnhancedLearningProgress[];
    streaksFixed: number;
  }>;
  saveToEnhancedStorage(selection: EnhancedDailySelection): Promise<void>;
  loadFromEnhancedStorage(date: string): Promise<EnhancedDailySelection | null>;
  cleanupOldSelections(): Promise<void>;
}

// Category arrangement service
interface ICategoryArrangementService {
  detectCategoryStreaks(words: EnhancedLearningProgress[]): number[];
  breakCategoryStreak(words: EnhancedLearningProgress[], streakStart: number): void;
  validateArrangement(words: EnhancedLearningProgress[]): boolean;
  calculateMaxConsecutive(words: EnhancedLearningProgress[]): number;
}

// Enhanced persistence service
interface IEnhancedPersistenceService {
  saveToSessionStorage(key: string, data: any): Promise<void>;
  saveToLocalStorage(key: string, data: any): Promise<void>;
  loadFromSessionStorage(key: string): Promise<any>;
  loadFromLocalStorage(key: string): Promise<any>;
  generateStorageKeys(date: string): { sessionKey: string; persistentKey: string };
}
```

### 3. Playback Control Domain Services

```typescript
// Playback queue service
interface IPlaybackQueueService {
  // Queue management
  initializeQueue(dailySelection: EnhancedDailySelection): Promise<void>;
  getCurrentWord(): Promise<EnhancedLearningProgress | null>;
  advanceToNext(isAutoAdvance: boolean): Promise<QueueNavigation>;
  resetQueue(): Promise<void>;
  
  // State management
  getQueueState(): Promise<PlaybackQueueState | null>;
  saveQueueState(state: PlaybackQueueState): Promise<void>;
  loadQueueState(): Promise<PlaybackQueueState | null>;
  
  // Spacing rules
  canPlayWord(word: EnhancedLearningProgress): Promise<{ canPlay: boolean; reason?: string }>;
  updateLastPlayed(word: EnhancedLearningProgress): Promise<void>;
}

// Spacing rules engine service
interface ISpacingRulesService {
  checkFiveItemRule(word: EnhancedLearningProgress, state: PlaybackQueueState): boolean;
  checkTimeDelayRule(word: EnhancedLearningProgress): Promise<boolean>;
  applySpacingRule(word: EnhancedLearningProgress, state: PlaybackQueueState): Promise<boolean>;
  updateSpacingState(word: EnhancedLearningProgress, state: PlaybackQueueState): Promise<void>;
}

// Queue navigation service
interface IQueueNavigationService {
  calculateNextNavigation(state: PlaybackQueueState): Promise<QueueNavigation>;
  findNextEligibleWord(state: PlaybackQueueState): Promise<EnhancedLearningProgress | null>;
  handleLoopCompletion(state: PlaybackQueueState): Promise<void>;
  validateQueueState(state: PlaybackQueueState): boolean;
}
```

### 4. Application Lifecycle Domain Services

```typescript
// Learning progress integrator service
interface ILearningProgressIntegratorService {
  // App lifecycle
  initializeOnAppStart(): Promise<void>;
  checkDateChange(): Promise<boolean>;
  handleDateChange(previousDate: string, currentDate: string): Promise<void>;
  
  // Progress coordination
  updateWordProgress(wordKey: string, actionType: 'MANUAL_ADVANCE' | 'AUTO_ADVANCE' | 'COMPLETION'): Promise<void>;
  refreshProgressStats(): Promise<void>;
  
  // Component coordination
  initializeComponents(): Promise<void>;
  checkComponentReadiness(): Promise<boolean>;
}

// Component initializer service
interface IComponentInitializerService {
  initializeComponent(component: string): Promise<void>;
  checkDependencies(component: string): Promise<boolean>;
  handleInitializationFailure(component: string, error: Error): Promise<void>;
  getInitializationOrder(): string[];
}

// Date change monitor service
interface IDateChangeMonitorService {
  startMonitoring(): void;
  stopMonitoring(): void;
  checkForDateChange(): Promise<boolean>;
  setupVisibilityChangeDetection(): void;
}
```

### 5. User Interface Integration Domain Services

```typescript
// Playback integration service
interface IPlaybackIntegrationService {
  // UI connection
  connectWithVocabularyCard(): Promise<void>;
  enhanceExistingHandlers(): Promise<void>;
  setupAudioCompletionDetection(): Promise<void>;
  
  // Button handling
  handleNextClick(): Promise<void>;
  handlePausePlayClick(isPaused: boolean): Promise<void>;
  handleMuteClick(isMuted: boolean): Promise<void>;
  
  // State management
  syncWithQueue(): Promise<void>;
  updateCurrentWord(wordKey: string): Promise<void>;
  getIntegrationState(): UIIntegrationState;
}

// Audio completion detector service
interface IAudioCompletionDetectorService {
  setupDetection(): Promise<void>;
  enhanceUtteranceCreation(): Promise<void>;
  handleAudioCompletion(): Promise<void>;
  handleAutoAdvance(completedWordKey: string): Promise<void>;
}

// UI preservation service
interface IUIPreservationService {
  ensureNoVisualChanges(): Promise<boolean>;
  validateOriginalBehavior(): Promise<boolean>;
  handleIntegrationFailure(): Promise<void>;
  restoreOriginalHandlers(): Promise<void>;
}
```

## Command and Query Separation (CQRS) Patterns

### Commands (State-Changing Operations)

```typescript
// Learning Progress Commands
interface UpdateWordProgressCommand {
  wordKey: string;
  actionType: 'MANUAL_ADVANCE' | 'AUTO_ADVANCE' | 'COMPLETION';
  timestamp: string;
}

interface ResetDailyExposuresCommand {
  date: string;
  affectedWords: string[];
}

// Daily Scheduling Commands
interface GenerateDailySelectionCommand {
  allWords: VocabularyWord[];
  severity: SeverityLevel;
  date: string;
}

interface RearrangeCategoriesCommand {
  words: EnhancedLearningProgress[];
  maxConsecutive: number;
}

// Playback Queue Commands
interface InitializeQueueCommand {
  dailySelection: EnhancedDailySelection;
  queueId: string;
}

interface AdvanceQueueCommand {
  isAutoAdvance: boolean;
  currentIndex: number;
  timestamp: string;
}
```

### Queries (Read-Only Operations)

```typescript
// Learning Progress Queries
interface GetWordProgressQuery {
  wordKey: string;
}

interface GetProgressStatsQuery {
  includeToday: boolean;
}

interface CheckWordEligibilityQuery {
  wordKey: string;
  currentTime: string;
}

// Daily Scheduling Queries
interface GetTodaySelectionQuery {
  date: string;
}

interface GetHistoricalSelectionQuery {
  date: string;
}

// Playback Queue Queries
interface GetCurrentWordQuery {
  queueId: string;
}

interface GetQueueStateQuery {
  queueId: string;
}

interface CalculateNextNavigationQuery {
  currentState: PlaybackQueueState;
}
```

## Service Implementation Examples

### Enhanced Learning Progress Service

```typescript
class EnhancedLearningProgressService implements IEnhancedLearningProgressService {
  constructor(
    private timingCalculator: ITimingCalculatorService,
    private dailyReset: IDailyResetService,
    private eventBus: EventBus
  ) {}
  
  async updateWordExposure(wordKey: string): Promise<void> {
    const progress = await this.getWordProgress(wordKey);
    if (!progress) return;
    
    // Update exposure count and timing
    progress.exposuresToday += 1;
    progress.lastExposureTime = this.timingCalculator.getCurrentTimestamp();
    progress.nextAllowedTime = this.calculateNextAllowedTime(
      progress.exposuresToday, 
      progress.lastExposureTime
    );
    
    // Save updated progress
    await this.saveProgress(progress);
    
    // Publish event
    this.eventBus.publish({
      type: 'WORD_EXPOSED',
      payload: {
        wordKey,
        exposureTime: progress.lastExposureTime,
        exposureCount: progress.exposuresToday
      }
    });
  }
  
  calculateNextAllowedTime(exposureCount: number, lastExposureTime: string): string {
    const delayMinutes = this.timingCalculator.calculateDelay(exposureCount);
    return this.timingCalculator.addMinutes(lastExposureTime, delayMinutes);
  }
  
  async isWordEligibleForPlay(wordKey: string): Promise<boolean> {
    const progress = await this.getWordProgress(wordKey);
    if (!progress) return true;
    
    return this.timingCalculator.isTimeElapsed(progress.nextAllowedTime);
  }
}
```

### Enhanced Daily Scheduler Service

```typescript
class EnhancedDailySchedulerService implements IEnhancedDailySchedulerService {
  constructor(
    private categoryArranger: ICategoryArrangementService,
    private persistence: IEnhancedPersistenceService,
    private learningProgress: IEnhancedLearningProgressService,
    private eventBus: EventBus
  ) {}
  
  async generateDailySelection(
    allWords: VocabularyWord[], 
    severity: SeverityLevel
  ): Promise<EnhancedDailySelection> {
    // 1. Generate base selection using existing logic
    const baseSelection = await this.generateBaseSelection(allWords, severity);
    
    // 2. Apply category rearrangement
    const allSelectedWords = [...baseSelection.newWords, ...baseSelection.reviewWords];
    const { rearranged, streaksFixed } = await this.rearrangeByCategory(allSelectedWords);
    
    // 3. Create enhanced selection
    const enhancedSelection: EnhancedDailySelection = {
      newWords: rearranged.filter(w => !w.isLearned),
      reviewWords: rearranged.filter(w => w.isLearned),
      totalCount: rearranged.length,
      categoryArrangement: {
        originalOrder: allSelectedWords.map(w => w.category),
        rearrangedOrder: rearranged.map(w => w.category),
        streaksFixed,
        maxConsecutiveCategory: this.categoryArranger.calculateMaxConsecutive(rearranged)
      },
      persistenceInfo: {
        sessionKey: 'todayList',
        persistentKey: `todayList_${new Date().toISOString().split('T')[0]}`,
        generationDate: new Date().toISOString().split('T')[0],
        severity
      }
    };
    
    // 4. Save to storage
    await this.saveToEnhancedStorage(enhancedSelection);
    
    // 5. Publish events
    this.eventBus.publish({
      type: 'DAILY_LIST_GENERATED',
      payload: {
        date: enhancedSelection.persistenceInfo.generationDate,
        totalCount: enhancedSelection.totalCount,
        newWordsCount: enhancedSelection.newWords.length,
        reviewWordsCount: enhancedSelection.reviewWords.length,
        severity
      }
    });
    
    return enhancedSelection;
  }
}
```

## Integration Points with Existing Services

### Service Composition

```typescript
// Service factory for dependency injection
class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<string, any> = new Map();
  
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }
  
  registerService<T>(name: string, service: T): void {
    this.services.set(name, service);
  }
  
  getService<T>(name: string): T {
    return this.services.get(name) as T;
  }
  
  // Initialize all services with dependencies
  initializeServices(): void {
    // Create core services
    const eventBus = new EventBus();
    const timingCalculator = new TimingCalculatorService();
    const dailyReset = new DailyResetService();
    
    // Create domain services
    const learningProgress = new EnhancedLearningProgressService(
      timingCalculator, 
      dailyReset, 
      eventBus
    );
    
    const categoryArranger = new CategoryArrangementService();
    const persistence = new EnhancedPersistenceService();
    
    const dailyScheduler = new EnhancedDailySchedulerService(
      categoryArranger,
      persistence,
      learningProgress,
      eventBus
    );
    
    // Register services
    this.registerService('eventBus', eventBus);
    this.registerService('learningProgress', learningProgress);
    this.registerService('dailyScheduler', dailyScheduler);
    // ... register other services
  }
}
```

## Error Handling and Resilience Patterns

### Circuit Breaker Pattern

```typescript
class ServiceCircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

### Retry Pattern

```typescript
class ServiceRetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        await this.delay(delayMs * Math.pow(2, attempt - 1));
      }
    }
    
    throw lastError!;
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Testing Strategy for Services

### Service Testing Framework

```typescript
// Mock service factory for testing
class MockServiceFactory {
  createMockLearningProgressService(): jest.Mocked<IEnhancedLearningProgressService> {
    return {
      updateWordExposure: jest.fn(),
      calculateNextAllowedTime: jest.fn(),
      resetDailyExposures: jest.fn(),
      isWordEligibleForPlay: jest.fn(),
      // ... other methods
    } as jest.Mocked<IEnhancedLearningProgressService>;
  }
  
  createMockDailySchedulerService(): jest.Mocked<IEnhancedDailySchedulerService> {
    return {
      generateDailySelection: jest.fn(),
      rearrangeByCategory: jest.fn(),
      saveToEnhancedStorage: jest.fn(),
      // ... other methods
    } as jest.Mocked<IEnhancedDailySchedulerService>;
  }
}
```

## Performance Considerations

### Service Optimization

```typescript
// Caching layer for expensive operations
class ServiceCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  
  set(key: string, data: any, ttlMs: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
}
```