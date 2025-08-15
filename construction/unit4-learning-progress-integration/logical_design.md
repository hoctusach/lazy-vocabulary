# Unit 4: Learning Progress Integration - Logical Design

## Domain: Application Lifecycle

### Overview
Integrates enhanced learning progress functionality with app lifecycle, coordinates between all units, and provides triggers for daily list regeneration and progress updates.

## Architecture Components

### 1. Application Lifecycle State

```typescript
interface AppLifecycleState {
  isInitialized: boolean;
  currentDate: string;
  lastInitDate: string;
  hasDateChanged: boolean;
  initializationTimestamp: string;
  componentsReady: {
    learningProgress: boolean;
    dailyScheduler: boolean;
    playbackQueue: boolean;
    uiIntegration: boolean;
  };
}

interface SystemCoordination {
  initializationOrder: string[];
  dependencyMap: Map<string, string[]>;
  readinessChecks: Map<string, () => boolean>;
}
```

### 2. Core Integration Service

```typescript
class LearningProgressIntegrator {
  private state: AppLifecycleState;
  private readonly dateChangeCheckInterval = 60000; // 1 minute
  private dateCheckTimer: NodeJS.Timeout | null = null;
  
  // App lifecycle management
  async initializeOnAppStart(): Promise<void> {
    console.log('LearningProgressIntegrator: Starting app initialization');
    
    // 1. Initialize state
    this.state = {
      isInitialized: false,
      currentDate: this.getCurrentDate(),
      lastInitDate: localStorage.getItem('lastAppInitDate') || '',
      hasDateChanged: false,
      initializationTimestamp: new Date().toISOString(),
      componentsReady: {
        learningProgress: false,
        dailyScheduler: false,
        playbackQueue: false,
        uiIntegration: false
      }
    };
    
    // 2. Check for date change
    this.checkDateChange();
    
    // 3. Initialize components in dependency order
    await this.initializeComponents();
    
    // 4. Start periodic date checking
    this.startDateChangeMonitoring();
    
    // 5. Mark as initialized
    this.state.isInitialized = true;
    localStorage.setItem('lastAppInitDate', this.state.currentDate);
    
    this.publishEvent(new AppStartedEvent({
      timestamp: this.state.initializationTimestamp,
      isFirstLoad: this.state.lastInitDate !== this.state.currentDate
    }));
  }
  
  checkDateChange(): boolean {
    const currentDate = this.getCurrentDate();
    const lastDate = this.state?.currentDate || localStorage.getItem('lastAppInitDate');
    
    if (lastDate && lastDate !== currentDate) {
      this.state.hasDateChanged = true;
      this.state.currentDate = currentDate;
      
      this.publishEvent(new DateChangedEvent({
        previousDate: lastDate,
        currentDate: currentDate
      }));
      
      // Trigger daily reset and regeneration
      this.handleDateChange(lastDate, currentDate);
      
      return true;
    }
    
    return false;
  }
  
  private async handleDateChange(previousDate: string, currentDate: string): Promise<void> {
    console.log(`Date changed from ${previousDate} to ${currentDate}`);
    
    // 1. Reset daily exposure counts
    await this.learningProgressService.resetDailyExposures();
    
    // 2. Generate new daily selection
    const allWords = this.vocabularyService.getWordList();
    const severity = this.getUserPreferredSeverity();
    await this.dailyScheduler.generateDailySelection(allWords, severity);
    
    // 3. Reinitialize playback queue
    const newSelection = await this.dailyScheduler.getTodaySelection();
    if (newSelection) {
      this.playbackQueue.initializeQueue(newSelection);
    }
    
    // 4. Refresh progress statistics
    this.refreshProgressStats();
  }
}
```

### 3. Component Initialization Orchestrator

```typescript
class ComponentInitializer {
  private readonly initializationOrder = [
    'learningProgress',
    'dailyScheduler', 
    'playbackQueue',
    'uiIntegration'
  ];
  
  async initializeComponents(): Promise<void> {
    for (const component of this.initializationOrder) {
      await this.initializeComponent(component);
      this.state.componentsReady[component] = true;
    }
  }
  
  private async initializeComponent(component: string): Promise<void> {
    switch (component) {
      case 'learningProgress':
        await this.initializeLearningProgress();
        break;
      case 'dailyScheduler':
        await this.initializeDailyScheduler();
        break;
      case 'playbackQueue':
        await this.initializePlaybackQueue();
        break;
      case 'uiIntegration':
        await this.initializeUIIntegration();
        break;
    }
  }
  
  private async initializeLearningProgress(): Promise<void> {
    // Migrate existing data if needed
    await this.learningProgressService.migrateExistingData();
    
    // Reset daily counters if date changed
    if (this.state.hasDateChanged) {
      await this.learningProgressService.resetDailyExposures();
    }
  }
  
  private async initializeDailyScheduler(): Promise<void> {
    // Check if daily selection exists for today
    const today = this.getCurrentDate();
    const existingSelection = await this.dailyScheduler.getTodaySelection();
    
    if (!existingSelection || this.state.hasDateChanged) {
      // Generate new daily selection
      const allWords = this.vocabularyService.getWordList();
      const severity = this.getUserPreferredSeverity();
      await this.dailyScheduler.generateDailySelection(allWords, severity);
    }
  }
  
  private async initializePlaybackQueue(): Promise<void> {
    // Get today's selection and initialize queue
    const todaySelection = await this.dailyScheduler.getTodaySelection();
    if (todaySelection) {
      this.playbackQueue.initializeQueue(todaySelection);
    }
  }
  
  private async initializeUIIntegration(): Promise<void> {
    // Connect UI event handlers with domain services
    this.uiIntegration.connectWithPlaybackQueue();
    this.uiIntegration.connectWithProgressTracking();
  }
}
```

### 4. Progress Update Coordinator

```typescript
class ProgressUpdateCoordinator {
  async updateWordProgress(wordKey: string, actionType: 'MANUAL_ADVANCE' | 'AUTO_ADVANCE' | 'COMPLETION'): Promise<void> {
    // 1. Update learning progress
    const progressBefore = await this.learningProgressService.getWordProgress(wordKey);
    
    // Update based on action type
    switch (actionType) {
      case 'COMPLETION':
        await this.learningProgressService.updateWordProgress(wordKey);
        await this.learningProgressService.updateWordExposure(wordKey);
        break;
      case 'MANUAL_ADVANCE':
      case 'AUTO_ADVANCE':
        await this.learningProgressService.updateWordExposure(wordKey);
        break;
    }
    
    const progressAfter = await this.learningProgressService.getWordProgress(wordKey);
    
    // 2. Publish progress update event
    this.publishEvent(new ProgressUpdatedEvent({
      wordKey,
      progressData: progressAfter
    }));
    
    // 3. Update playback queue if needed
    if (actionType === 'COMPLETION') {
      this.playbackQueue.updateLastPlayed(progressAfter);
    }
    
    // 4. Refresh statistics
    this.refreshProgressStats();
  }
  
  refreshProgressStats(): void {
    const stats = this.learningProgressService.getProgressStats();
    
    this.publishEvent(new StatsRefreshedEvent({
      totalWords: stats.total,
      learnedWords: stats.learned,
      newWords: stats.new,
      dueWords: stats.due
    }));
    
    // Update progress panel if available
    if (this.progressPanel) {
      this.progressPanel.updateStats(stats);
    }
  }
}
```

### 5. Date Change Monitoring

```typescript
class DateChangeMonitor {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_FREQUENCY = 60000; // 1 minute
  
  startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.checkForDateChange();
    }, this.CHECK_FREQUENCY);
    
    // Also check on visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForDateChange();
      }
    });
  }
  
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  private checkForDateChange(): void {
    const currentDate = new Date().toISOString().split('T')[0];
    const lastKnownDate = localStorage.getItem('lastAppInitDate');
    
    if (lastKnownDate && lastKnownDate !== currentDate) {
      this.integrator.checkDateChange();
    }
  }
}
```

## Event-Driven Integration

### Events Published
- `AppStartedEvent`: When app initialization completes
- `DateChangedEvent`: When date change is detected
- `ProgressUpdatedEvent`: When word progress is updated
- `StatsRefreshedEvent`: When progress statistics are refreshed

### Events Consumed
- `WordAdvancedEvent`: Update progress for advanced words
- `AudioCompletedEvent`: Update progress for completed words
- `QueueInitializedEvent`: Confirm queue is ready
- `DailyListGeneratedEvent`: Confirm daily list is ready

## Integration Flow Diagram

```
App Start
    ↓
Check Date Change
    ↓
Initialize Learning Progress Service
    ↓
Initialize Daily Scheduler
    ↓
Initialize Playback Queue
    ↓
Initialize UI Integration
    ↓
Start Date Monitoring
    ↓
App Ready

Date Change Detected
    ↓
Reset Daily Exposures
    ↓
Generate New Daily Selection
    ↓
Reinitialize Playback Queue
    ↓
Refresh Progress Stats
```

## Storage Integration

### localStorage Coordination (Serverless)
```json
{
  "lastAppInitDate": "2025-01-15",
  "userPreferredSeverity": "moderate",
  "learningProgress": {
    "word1": {
      "word": "example",
      "category": "topic vocab",
      "isLearned": true,
      "reviewCount": 2,
      "status": "due",
      "nextReviewDate": "2025-01-17",
      "createdDate": "2025-01-15",
      "retiredDate": null
    }
  },
  "dailySelection": {
    "newWords": [],
    "reviewWords": [],
    "totalCount": 0
  },
  "lastSelectionDate": "2025-01-15"
}
```

## Error Handling and Recovery

### Initialization Failures
```typescript
class InitializationErrorHandler {
  async handleComponentFailure(component: string, error: Error): Promise<void> {
    console.error(`Failed to initialize ${component}:`, error);
    
    // Attempt recovery based on component
    switch (component) {
      case 'learningProgress':
        await this.recoverLearningProgress();
        break;
      case 'dailyScheduler':
        await this.recoverDailyScheduler();
        break;
      case 'playbackQueue':
        await this.recoverPlaybackQueue();
        break;
    }
  }
  
  private async recoverLearningProgress(): Promise<void> {
    // Clear corrupted data and reinitialize with localStorage
    localStorage.removeItem('learningProgress');
    localStorage.removeItem('dailySelection');
    localStorage.removeItem('lastSelectionDate');
    await this.learningProgressService.initializeWithDefaults();
  }
}
```

## Testing Strategy

### Unit Tests
- Date change detection accuracy
- Component initialization order
- Progress update coordination
- Error recovery mechanisms

### Integration Tests
- End-to-end app startup flow
- Cross-component event handling
- Date change handling
- Progress panel integration

## Performance Considerations

### Initialization Optimization
- Lazy loading of non-critical components
- Parallel initialization where possible
- Efficient data migration strategies

### Memory Management
- Cleanup of event listeners
- Efficient state management
- Garbage collection of stale data