# Unit 3: Playback Queue Management - Logical Design

## Domain: Playback Control

### Overview
Implements new playback queue functionality for auto-advance, loop behavior, and spacing rules while integrating with enhanced daily selection and timing controls.

## Architecture Components

### 1. Domain Model Alignment

```typescript
// Core aggregate root from domain model
interface PlaybackQueueState {
  todayList: EnhancedLearningProgress[];
  currentIndex: number;
  lastPlayedWords: string[]; // max 5 items for spacing rule
  isLooping: boolean;
  loopCount: number;
  queueId: string;
  initializationTime: string;
  lastAdvanceTime: string;
}

// Value objects for domain logic
interface SpacingRule {
  type: 'FIVE_ITEM_GAP' | 'TIME_DELAY' | 'CATEGORY_LIMIT';
  isViolated: (word: EnhancedLearningProgress, state: PlaybackQueueState) => boolean;
  apply: (word: EnhancedLearningProgress, state: PlaybackQueueState) => boolean;
}

interface QueueNavigation {
  canAdvance: boolean;
  nextIndex: number;
  nextWord: EnhancedLearningProgress | null;
  skipReason?: 'TIME_DELAY' | 'FIVE_ITEM_GAP' | 'END_OF_QUEUE';
}
```

### 2. Repository Interface

```typescript
// Simple sessionStorage extension pattern
interface PlaybackQueueRepository {
  getQueueState(): PlaybackQueueState | null;
  saveQueueState(state: PlaybackQueueState): void;
  clearQueue(): void;
}

// Implementation using existing sessionStorage patterns
const playbackQueueRepository: PlaybackQueueRepository = {
  getQueueState(): PlaybackQueueState | null {
    const stored = sessionStorage.getItem('playbackQueue');
    if (!stored) return null;
    
    try {
      const state = JSON.parse(stored) as PlaybackQueueState;
      // Validate state integrity
      if (this.isValidState(state)) {
        return state;
      }
    } catch (error) {
      console.warn('Failed to load queue state:', error);
    }
    
    return null;
  },
  
  saveQueueState(state: PlaybackQueueState): void {
    try {
      sessionStorage.setItem('playbackQueue', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save queue state:', error);
    }
  },
  
  clearQueue(): void {
    sessionStorage.removeItem('playbackQueue');
  },
  
  isValidState(state: any): state is PlaybackQueueState {
    return state &&
           Array.isArray(state.todayList) &&
           typeof state.currentIndex === 'number' &&
           Array.isArray(state.lastPlayedWords) &&
           state.lastPlayedWords.length <= 5;
  }
};
```

### 3. Playback Queue State Model

```typescript
interface PlaybackQueueState {
  todayList: EnhancedLearningProgress[];
  currentIndex: number;
  lastPlayedWords: string[];        // max 5 items for spacing rule
  isLooping: boolean;
  loopCount: number;
  queueId: string;                  // unique identifier for session
  initializationTime: string;
  lastAdvanceTime: string;
}

interface QueueNavigation {
  canAdvance: boolean;
  nextIndex: number;
  nextWord: EnhancedLearningProgress | null;
  skipReason?: 'TIME_DELAY' | 'FIVE_ITEM_GAP' | 'END_OF_QUEUE';
}
```

### 2. Core Service Implementation

```typescript
class PlaybackQueueService {
  private state: PlaybackQueueState | null = null;
  private readonly STORAGE_KEY = 'playbackQueue';
  private readonly MAX_LAST_PLAYED = 5;
  
  // Queue initialization with FR3 filtering
  initializeQueue(dailySelection: EnhancedDailySelection): void {
    // FR3: Filter out retired and mastered words from queue
    const activeWords = this.filterActiveWords([...dailySelection.newWords, ...dailySelection.reviewWords]);
    
    this.state = {
      todayList: activeWords,
      currentIndex: 0,
      lastPlayedWords: [],
      isLooping: false,
      loopCount: 0,
      queueId: this.generateQueueId(),
      initializationTime: new Date().toISOString(),
      lastAdvanceTime: ''
    };
    
    this.saveState();
    this.publishEvent(new QueueInitializedEvent(this.state));
  }
  
  // NEW FR3: Filter active words for queue
  private filterActiveWords(words: EnhancedLearningProgress[]): EnhancedLearningProgress[] {
    return words.filter(word => {
      const progress = this.learningProgressService.getProgress(word.word);
      // FR3.2: Exclude retired words
      if (progress?.retired) return false;
      // FR3.4: Exclude mastered words  
      if (progress?.isMastered) return false;
      return true;
    });
  }
  
  // NEW FR3: Remove word from current queue
  removeWordFromQueue(wordKey: string): void {
    if (!this.state) return;
    
    const wordIndex = this.state.todayList.findIndex(w => w.word === wordKey);
    if (wordIndex === -1) return;
    
    // Remove word from queue
    this.state.todayList.splice(wordIndex, 1);
    
    // Adjust current index if necessary
    if (wordIndex <= this.state.currentIndex && this.state.currentIndex > 0) {
      this.state.currentIndex--;
    }
    
    this.saveState();
  }
  
  // Queue navigation
  getCurrentWord(): EnhancedLearningProgress | null {
    if (!this.state || this.state.todayList.length === 0) return null;
    return this.state.todayList[this.state.currentIndex] || null;
  }
  
  advanceToNext(isAutoAdvance: boolean = false): QueueNavigation {
    if (!this.state) return { canAdvance: false, nextIndex: -1, nextWord: null };
    
    const navigation = this.calculateNextNavigation();
    
    if (navigation.canAdvance) {
      const fromIndex = this.state.currentIndex;
      this.state.currentIndex = navigation.nextIndex;
      this.state.lastAdvanceTime = new Date().toISOString();
      
      // Handle loop completion
      if (navigation.nextIndex === 0 && fromIndex > 0) {
        this.state.loopCount++;
        this.state.isLooping = true;
        this.publishEvent(new LoopCompletedEvent(this.state));
      }
      
      this.saveState();
      this.publishEvent(new WordAdvancedEvent({
        fromIndex,
        toIndex: navigation.nextIndex,
        wordKey: navigation.nextWord?.word || '',
        isAutoAdvance
      }));
    }
    
    return navigation;
  }
}
```

### 3. Spacing Rules Engine

```typescript
class SpacingRulesEngine {
  private readonly timingService: EnhancedLearningProgressService;
  
  canPlayWord(word: EnhancedLearningProgress, state: PlaybackQueueState): {
    canPlay: boolean;
    reason?: string;
  } {
    // Rule 1: Five-item spacing rule
    if (this.violatesFiveItemRule(word, state)) {
      return { canPlay: false, reason: 'FIVE_ITEM_GAP' };
    }
    
    // Rule 2: Time-based delay rule
    if (!this.timingService.isWordEligibleForPlay(word.word)) {
      return { canPlay: false, reason: 'TIME_DELAY' };
    }
    
    return { canPlay: true };
  }
  
  private violatesFiveItemRule(word: EnhancedLearningProgress, state: PlaybackQueueState): boolean {
    return state.lastPlayedWords.includes(word.word);
  }
  
  updateLastPlayed(word: EnhancedLearningProgress, state: PlaybackQueueState): void {
    // Add to front, remove from back if exceeds limit
    state.lastPlayedWords.unshift(word.word);
    if (state.lastPlayedWords.length > this.MAX_LAST_PLAYED) {
      state.lastPlayedWords = state.lastPlayedWords.slice(0, this.MAX_LAST_PLAYED);
    }
  }
}
```

### 4. Queue Navigation Logic

```typescript
class QueueNavigator {
  calculateNextNavigation(state: PlaybackQueueState): QueueNavigation {
    if (!state.todayList.length) {
      return { canAdvance: false, nextIndex: -1, nextWord: null, skipReason: 'END_OF_QUEUE' };
    }
    
    let nextIndex = (state.currentIndex + 1) % state.todayList.length;
    let attempts = 0;
    const maxAttempts = state.todayList.length;
    
    // Find next eligible word
    while (attempts < maxAttempts) {
      const nextWord = state.todayList[nextIndex];
      const eligibility = this.spacingRules.canPlayWord(nextWord, state);
      
      if (eligibility.canPlay) {
        return {
          canAdvance: true,
          nextIndex,
          nextWord
        };
      }
      
      // Try next word
      nextIndex = (nextIndex + 1) % state.todayList.length;
      attempts++;
      
      // If we've looped back to current position, no eligible words
      if (nextIndex === state.currentIndex) {
        return {
          canAdvance: false,
          nextIndex: state.currentIndex,
          nextWord: state.todayList[state.currentIndex],
          skipReason: eligibility.reason as any
        };
      }
    }
    
    // Fallback: stay at current position
    return {
      canAdvance: false,
      nextIndex: state.currentIndex,
      nextWord: state.todayList[state.currentIndex],
      skipReason: 'TIME_DELAY'
    };
  }
}
```

### 5. State Persistence Manager

```typescript
class QueueStateManager {
  private readonly STORAGE_KEY = 'playbackQueue';
  
  saveState(state: PlaybackQueueState): void {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save queue state:', error);
    }
  }
  
  loadState(): PlaybackQueueState | null {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      const state = JSON.parse(stored) as PlaybackQueueState;
      
      // Validate state integrity
      if (this.isValidState(state)) {
        return state;
      }
    } catch (error) {
      console.warn('Failed to load queue state:', error);
    }
    
    return null;
  }
  
  clearState(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
  
  private isValidState(state: any): state is PlaybackQueueState {
    return state &&
           Array.isArray(state.todayList) &&
           typeof state.currentIndex === 'number' &&
           Array.isArray(state.lastPlayedWords) &&
           state.lastPlayedWords.length <= 5;
  }
}
```

## Event-Driven Integration

### Events Published
- `QueueInitializedEvent`: When queue is set up with daily selection
- `WordAdvancedEvent`: When moving to next word (manual or auto)
- `LoopCompletedEvent`: When queue loops back to beginning
- `SpacingRuleAppliedEvent`: When word is skipped due to spacing rules

### Events Consumed
- `DailyListGeneratedEvent`: Initialize queue with new daily selection
- `AudioCompletedEvent`: Trigger auto-advance and implicit review (FR3.3)
- `ButtonClickedEvent`: Handle manual navigation
- `WordRetiredEvent`: Remove retired words from current queue (FR3.2)
- `WordMasteredEvent`: Remove mastered words from current queue (FR3.4)
- `ReviewCompletedEvent`: Update queue state after review completion

## FR3 Integration: Queue Management

```typescript
class FR3QueueManager {
  onWordRetired(wordKey: string): void {
    // Remove from current playback queue
    this.queueService.removeWordFromQueue(wordKey);
    
    // Publish queue updated event
    this.publishEvent(new QueueUpdatedEvent({
      action: 'WORD_REMOVED',
      wordKey,
      reason: 'RETIRED'
    }));
  }
  
  onWordMastered(wordKey: string): void {
    // Remove from current playback queue
    this.queueService.removeWordFromQueue(wordKey);
    
    // Publish queue updated event
    this.publishEvent(new QueueUpdatedEvent({
      action: 'WORD_REMOVED',
      wordKey,
      reason: 'MASTERED'
    }));
  }
  
  onImplicitReviewCompleted(wordKey: string): void {
    // FR3.3: Playback completion triggers implicit review
    // This is handled in the audio completion flow
    // No additional queue management needed
  }
}
```

## Integration Flow

```typescript
class PlaybackQueueOrchestrator {
  async handleAudioCompleted(event: AudioCompletedEvent): Promise<void> {
    // Update word progress and exposure
    await this.learningProgressService.updateWordExposure(event.payload.wordKey);
    
    // NEW FR3.3: Handle implicit review completion
    await this.learningProgressService.handleImplicitReview(event.payload.wordKey);
    
    // Update last played tracking
    const currentWord = this.queueService.getCurrentWord();
    if (currentWord) {
      this.spacingRules.updateLastPlayed(currentWord, this.queueService.getState());
    }
    
    // Auto-advance to next word
    if (event.payload.autoAdvance) {
      const navigation = this.queueService.advanceToNext(true);
      
      if (navigation.canAdvance && navigation.nextWord) {
        // Trigger playback of next word
        this.publishEvent(new WordAdvancedEvent({
          fromIndex: this.queueService.getState().currentIndex - 1,
          toIndex: navigation.nextIndex,
          wordKey: navigation.nextWord.word,
          isAutoAdvance: true
        }));
      }
    }
  }
  
  // NEW FR3: Handle word retirement
  handleWordRetired(event: WordRetiredEvent): void {
    this.queueService.removeWordFromQueue(event.payload.wordKey);
  }
  
  // NEW FR3: Handle word mastery
  handleWordMastered(event: WordMasteredEvent): void {
    this.queueService.removeWordFromQueue(event.payload.wordKey);
  }
  
  handleManualNext(): void {
    const navigation = this.queueService.advanceToNext(false);
    
    if (!navigation.canAdvance) {
      // Show user feedback about why advance failed
      this.publishEvent(new SpacingRuleAppliedEvent({
        wordKey: navigation.nextWord?.word || '',
        ruleType: navigation.skipReason === 'TIME_DELAY' ? 'TIME_DELAY' : 'FIVE_ITEM_GAP',
        skipped: true
      }));
    }
  }
}
```

## Storage Schema

### sessionStorage
```json
{
  "playbackQueue": {
    "todayList": [
      // Array of EnhancedLearningProgress objects
    ],
    "currentIndex": 5,
    "lastPlayedWords": ["word1", "word2", "word3", "word4", "word5"],
    "isLooping": false,
    "loopCount": 0,
    "queueId": "queue_20250115_143022",
    "initializationTime": "2025-01-15T14:30:22.000Z",
    "lastAdvanceTime": "2025-01-15T14:35:10.000Z"
  }
}
```

## Error Handling

### Queue State Corruption
- Validate state on load
- Reinitialize if corrupted
- Fallback to empty queue

### Navigation Failures
- Handle empty queue gracefully
- Manage infinite loops in navigation
- Provide user feedback for blocked advances

### Storage Failures
- Handle sessionStorage quota exceeded
- Graceful degradation without persistence
- Recovery mechanisms for lost state

## Testing Strategy

### Unit Tests
- Queue navigation logic
- Spacing rules enforcement
- State persistence and recovery
- Loop behavior validation
- **NEW FR3**: Word filtering for retired/mastered words
- **NEW FR3**: Queue word removal functionality
- **NEW FR3**: Implicit review triggering

### Integration Tests
- Event flow between components
- Auto-advance functionality
- Manual navigation handling
- State synchronization
- **NEW FR3**: Retired word removal from active queue
- **NEW FR3**: Mastered word exclusion from playback
- **NEW FR3**: Implicit review completion flow

## Performance Considerations

### Memory Management
- Efficient queue state updates
- Minimal object creation during navigation
- Cleanup of stale state data

### Navigation Optimization
- Fast eligibility checks
- Efficient circular queue traversal
- Batch state updates where possible