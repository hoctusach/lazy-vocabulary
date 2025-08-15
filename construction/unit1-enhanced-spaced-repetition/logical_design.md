# Unit 1: Enhanced Spaced Repetition Engine - Logical Design

## Domain: Learning Progress Management

### Overview
Extends existing `LearningProgressService` with intra-day exposure tracking and time-based repetition delays while maintaining full backward compatibility.

## Architecture Components

### 1. Domain Model Alignment

```typescript
// Core aggregate root from domain model
interface EnhancedLearningProgress extends LearningProgress {
  // Existing fields preserved
  word: string;
  category: string;
  isLearned: boolean;
  reviewCount: number;
  lastPlayedDate: string;
  status: 'due' | 'not_due' | 'new';
  nextReviewDate: string;
  createdDate: string;
  
  // Timing fields
  exposuresToday: number;
  lastExposureTime: string;
  nextAllowedTime: string;
  
  // FR3 fields
  isMastered: boolean;
  retired: boolean;
}

// Value objects for domain logic
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

### 2. Enhanced Data Model

```typescript
// Extends existing LearningProgress interface
interface EnhancedLearningProgress extends LearningProgress {
  // EXISTING: Intra-day timing fields
  exposuresToday: number;        // Reset daily at midnight
  lastExposureTime: string;      // ISO timestamp of last play
  nextAllowedTime: string;       // Calculated next eligible time
  
  // NEW FR3: Review scheduling fields
  reviewCount: number;           // Default: 0
  nextReviewDate: string | null; // Default: null
  lastPlayedDate: string | null; // Default: null
  isMastered: boolean;          // Default: false
  retired: boolean;             // Default: false
}

// Timing calculation constants
const EXPOSURE_DELAYS = [0, 5, 7, 10, 15, 30, 60, 90, 120]; // minutes

// NEW FR3.1: Review interval constants
const REVIEW_INTERVALS = [1, 2, 3, 5, 7, 10, 14, 21, 28, 35]; // days for reviews 1-10
const MASTER_INTERVAL = 60; // days from review 11 onward
```

### 3. Repository Interface

```typescript
// Simple localStorage extension pattern
interface LearningProgressRepository {
  getProgress(wordKey: string): EnhancedLearningProgress | null;
  saveProgress(wordKey: string, progress: EnhancedLearningProgress): void;
  getAllProgress(): Map<string, EnhancedLearningProgress>;
  migrateExistingData(): void;
}

// Implementation using existing localStorage patterns
const learningProgressRepository: LearningProgressRepository = {
  getProgress(wordKey: string): EnhancedLearningProgress | null {
    const stored = localStorage.getItem('learningProgress');
    if (!stored) return null;
    const allProgress = JSON.parse(stored);
    return allProgress[wordKey] || null;
  },
  
  saveProgress(wordKey: string, progress: EnhancedLearningProgress): void {
    const stored = localStorage.getItem('learningProgress') || '{}';
    const allProgress = JSON.parse(stored);
    allProgress[wordKey] = progress;
    localStorage.setItem('learningProgress', JSON.stringify(allProgress));
  },
  
  getAllProgress(): Map<string, EnhancedLearningProgress> {
    const stored = localStorage.getItem('learningProgress') || '{}';
    const allProgress = JSON.parse(stored);
    return new Map(Object.entries(allProgress));
  },
  
  migrateExistingData(): void {
    const stored = localStorage.getItem('learningProgress');
    if (!stored) return;
    
    const allProgress = JSON.parse(stored);
    Object.keys(allProgress).forEach(wordKey => {
      const progress = allProgress[wordKey];
      // Add missing fields with defaults
      if (progress.exposuresToday === undefined) progress.exposuresToday = 0;
      if (progress.lastExposureTime === undefined) progress.lastExposureTime = '';
      if (progress.nextAllowedTime === undefined) progress.nextAllowedTime = new Date().toISOString();
      if (progress.reviewCount === undefined) progress.reviewCount = 0;
      if (progress.isMastered === undefined) progress.isMastered = false;
      if (progress.retired === undefined) progress.retired = false;
    });
    
    localStorage.setItem('learningProgress', JSON.stringify(allProgress));
  }
};
```

### 4. Service Extensions

```typescript
class EnhancedLearningProgressService extends LearningProgressService {
  // EXISTING: Exposure tracking methods
  updateWordExposure(wordKey: string): void;
  calculateNextAllowedTime(exposureCount: number, lastExposureTime: string): string;
  resetDailyExposures(): void;
  isWordEligibleForPlay(wordKey: string): boolean;
  
  // NEW FR3: Review scheduling methods
  calculateNextReviewDate(reviewCount: number, lastPlayedDate: string): string;
  handleImplicitReview(wordKey: string): void; // FR3.3
  retireWord(wordKey: string): void; // FR3.2
  checkMasteryStatus(wordKey: string): void; // FR3.4
  isWordDueForReview(wordKey: string): boolean;
  
  // ENHANCED: Existing methods with review integration
  updateWordProgress(wordKey: string): void; // Extended with review logic
  initializeWord(word: VocabularyWord): EnhancedLearningProgress; // Extended with defaults
}
```

### 3. Event-Driven Integration

#### Events Published
- `WordExposedEvent`: When word is played
- `ExposureCountResetEvent`: Daily reset at midnight
- `TimingDelayCalculatedEvent`: When next allowed time is calculated
- `WordRetiredEvent`: When word is retired (FR3.2)
- `WordMasteredEvent`: When word reaches mastery (FR3.4)
- `ReviewCompletedEvent`: When implicit review is completed (FR3.3)

#### Events Consumed
- `AudioCompletedEvent`: From UI Integration Domain
- `DateChangedEvent`: From Application Lifecycle Domain
- `PlaybackCompletedEvent`: For implicit review updates (FR3.3)

### 4. Implementation Strategy

#### Data Migration
```typescript
class LearningProgressMigrator {
  migrateExistingData(): void {
    // Add timing fields to existing progress records
    // Set defaults: exposuresToday = 0, lastExposureTime = '', nextAllowedTime = now
    
    // NEW FR3: Add review scheduling fields
    // Set defaults: reviewCount = 0, nextReviewDate = null, lastPlayedDate = null
    //              isMastered = false, retired = false
  }
}
```

#### Timing Logic
```typescript
class TimingCalculator {
  calculateDelay(exposureCount: number): number {
    return EXPOSURE_DELAYS[Math.min(exposureCount, EXPOSURE_DELAYS.length - 1)];
  }
  
  addMinutes(timestamp: string, minutes: number): string {
    return new Date(new Date(timestamp).getTime() + minutes * 60000).toISOString();
  }
}
```

#### Daily Reset Logic
```typescript
class DailyResetManager {
  checkAndResetIfNewDay(): void {
    const today = new Date().toISOString().split('T')[0];
    const lastResetDate = localStorage.getItem('lastExposureResetDate');
    
    if (lastResetDate !== today) {
      this.resetAllExposureCounts();
      localStorage.setItem('lastExposureResetDate', today);
    }
  }
}
```

#### NEW FR3.1: Review Interval Calculator
```typescript
class ReviewIntervalCalculator {
  calculateNextReviewDate(reviewCount: number, lastPlayedDate: string): string {
    const intervalDays = reviewCount < REVIEW_INTERVALS.length 
      ? REVIEW_INTERVALS[reviewCount] 
      : MASTER_INTERVAL;
    
    const nextDate = new Date(lastPlayedDate);
    nextDate.setDate(nextDate.getDate() + intervalDays);
    return nextDate.toISOString().split('T')[0];
  }
  
  shiftFutureReviews(actualReviewDate: string, scheduledDate: string): void {
    // Shift future reviews if delayed
    const delay = this.calculateDelayDays(actualReviewDate, scheduledDate);
    if (delay > 0) {
      // Apply delay to future reviews
    }
  }
}
```

#### NEW FR3.2: Word State Manager
```typescript
class WordStateManager {
  retireWord(wordKey: string): void {
    const progress = this.getProgress(wordKey);
    progress.retired = true;
    progress.isMastered = false;
    progress.reviewCount = 0;
    progress.nextReviewDate = null;
    this.saveProgress(wordKey, progress);
  }
  
  isWordActive(wordKey: string): boolean {
    const progress = this.getProgress(wordKey);
    return !progress.retired;
  }
}
```

#### NEW FR3.4: Mastery Manager
```typescript
class MasteryManager {
  checkAndUpdateMastery(wordKey: string): void {
    const progress = this.getProgress(wordKey);
    
    if (progress.reviewCount >= 10 && !progress.isMastered) {
      progress.isMastered = true;
      progress.nextReviewDate = this.calculateMasteryReviewDate();
      this.saveProgress(wordKey, progress);
      
      // Publish mastery event
      this.eventBus.publish('WordMasteredEvent', { wordKey });
    }
  }
  
  calculateMasteryReviewDate(): string {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + MASTER_INTERVAL);
    return nextDate.toISOString().split('T')[0];
  }
}
```

## Storage Strategy

### localStorage Schema Extension
```json
{
  "learningProgress": {
    "wordKey": {
      // Existing fields preserved
      "word": "example",
      "category": "topic vocab",
      "isLearned": false,
      "status": "new",
      "createdDate": "2025-01-15",
      
      // Existing timing fields
      "exposuresToday": 2,
      "lastExposureTime": "2025-01-15T14:30:00.000Z",
      "nextAllowedTime": "2025-01-15T14:37:00.000Z",
      
      // NEW FR3: Review scheduling fields
      "reviewCount": 3,
      "nextReviewDate": "2025-01-20",
      "lastPlayedDate": "2025-01-15", 
      "isMastered": false,
      "retired": false
    }
  },
  "lastExposureResetDate": "2025-01-15"
}
```

## FR3 Review Scheduling Implementation

### FR3.1: Review Interval Scheduling
```typescript
class ReviewScheduler {
  handlePlaybackCompleted(wordKey: string): void {
    const progress = this.getProgress(wordKey);
    const today = new Date().toISOString().split('T')[0];
    
    // FR3.3: Implicit review update
    progress.reviewCount += 1;
    progress.lastPlayedDate = today;
    progress.nextReviewDate = this.calculateNextReviewDate(progress.reviewCount, today);
    
    // FR3.4: Check mastery
    if (progress.reviewCount >= 10) {
      progress.isMastered = true;
      progress.nextReviewDate = this.calculateMasteryDate(today);
    }
    
    this.saveProgress(wordKey, progress);
  }
  
  handleDailyQuotaReached(wordKey: string): void {
    // Push to next day if quota reached
    const progress = this.getProgress(wordKey);
    const nextDate = new Date(progress.nextReviewDate);
    nextDate.setDate(nextDate.getDate() + 1);
    progress.nextReviewDate = nextDate.toISOString().split('T')[0];
    this.saveProgress(wordKey, progress);
  }
}
```

### FR3.2: Retired Words Handling
```typescript
class RetiredWordsFilter {
  filterActiveWords(words: string[]): string[] {
    return words.filter(wordKey => {
      const progress = this.getProgress(wordKey);
      return !progress.retired;
    });
  }
  
  excludeFromPlaylist(words: string[]): string[] {
    return words.filter(wordKey => {
      const progress = this.getProgress(wordKey);
      return !progress.retired && !progress.isMastered;
    });
  }
}
```

### FR3.3: Implicit Review Logic
```typescript
class ImplicitReviewHandler {
  onPlaybackCompleted(wordKey: string): void {
    // No explicit user feedback = implicit review
    const progress = this.getProgress(wordKey);
    const today = new Date().toISOString().split('T')[0];
    
    progress.reviewCount += 1;
    progress.lastPlayedDate = today;
    progress.nextReviewDate = this.reviewCalculator.calculateNextReviewDate(
      progress.reviewCount, today
    );
    
    this.saveProgress(wordKey, progress);
    this.eventBus.publish('ReviewCompletedEvent', { wordKey, implicit: true });
  }
}
```

### FR3.4: Mastery Management
```typescript
class MasteryFilter {
  excludeMasteredFromDaily(words: string[]): string[] {
    return words.filter(wordKey => {
      const progress = this.getProgress(wordKey);
      return !progress.isMastered;
    });
  }
  
  getMasteredWords(): string[] {
    const allProgress = this.getAllProgress();
    return Object.keys(allProgress).filter(wordKey => 
      allProgress[wordKey].isMastered
    );
  }
}
```

## Integration Points

### With Existing Services
- **Extends**: `LearningProgressService` (singleton pattern preserved)
- **Uses**: Existing localStorage keys and data structure
- **Maintains**: All existing public methods and interfaces

### With Other Units
- **Unit 2**: Provides enhanced progress data for daily selection
- **Unit 3**: Provides eligibility checks for playback queue
- **Unit 4**: Receives lifecycle events for daily resets
- **Unit 5**: Receives word completion events for exposure tracking

## Error Handling

### Data Consistency
- Validate timing fields on load
- Handle missing fields gracefully with defaults
- Ensure exposuresToday never goes negative

### Edge Cases
- Handle system clock changes
- Manage localStorage quota limits
- Deal with corrupted timing data

## Testing Strategy

### Unit Tests
- Timing calculation accuracy
- Daily reset functionality
- Data migration correctness
- Exposure tracking increment/reset
- **NEW FR3**: Review interval calculations
- **NEW FR3**: Mastery status transitions
- **NEW FR3**: Retired word filtering
- **NEW FR3**: Implicit review updates

### Integration Tests
- Backward compatibility with existing data
- Event publishing/consuming
- localStorage persistence
- **NEW FR3**: Review scheduling with daily selection
- **NEW FR3**: Mastered word exclusion from playlists
- **NEW FR3**: Retired word state management

### FR3 Specific Test Scenarios
- `reviewCount = 4, lastPlayedDate = "2025-08-01"` → `nextReviewDate = "2025-08-06"`
- Delayed playback shifts future intervals correctly
- Daily quota reached pushes `nextReviewDate++`
- `retired: true` excludes from all playlists and resets progress
- Playback completion increments `reviewCount` and updates dates
- `reviewCount >= 10` sets `isMastered = true` and `nextReviewDate = today + 60`

## Performance Considerations

### Optimization
- Lazy loading of timing calculations
- Batch updates for multiple words
- Efficient daily reset operations

### Memory Management
- Minimal memory footprint for timing data
- Cleanup of stale timing information

## Deployment Strategy

### Rollout Plan
1. Deploy enhanced service alongside existing service
2. Migrate existing data on first load
3. Gradually enable timing features
4. Monitor for performance impact

### Rollback Plan
- Preserve existing data structure
- Disable timing features if issues arise
- Fall back to original service behavior