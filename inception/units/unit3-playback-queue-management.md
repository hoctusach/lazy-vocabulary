# Unit 3: Playback Queue Management

## Overview
Implements new playback queue functionality for auto-advance, loop behavior, and spacing rules as specified in FR2.1, FR2.3, and FR2.6.

## User Stories

### US3.1: Auto-Advance Playback Queue
**As a** learner  
**I want** the app to automatically move to the next word when audio finishes  
**So that** I can have a continuous learning experience without manual intervention  

**Acceptance Criteria:**
- Create playback queue using `sessionStorage["todayList"]`
- Track current position with `currentIndex` pointer
- Auto-advance to next word when audio (word + meaning + example) completes
- Handle queue initialization from daily selection

### US3.2: Loop Behavior
**As a** learner  
**I want** the word list to restart from the beginning when it reaches the end  
**So that** I can continue learning without interruption  

**Acceptance Criteria:**
- When `currentIndex` reaches end of list, reset to 0
- Continue playback from first word in the list
- Maintain seamless transition without user intervention
- Track loop cycles for potential future analytics

### US3.3: Five-Item Spacing Rule
**As a** learner  
**I want** recently played words to not repeat until at least 5 other words have been played  
**So that** I get better variety and retention in my learning session  

**Acceptance Criteria:**
- Maintain `lastPlayedWords` queue with maximum 5 items
- Before playing a word, check if it's in the last 5 played words
- Skip or delay words that violate the 5-item spacing rule
- Update `lastPlayedWords` queue after each word is played

### US3.4: Queue State Management
**As a** developer  
**I want** a centralized playback queue manager  
**So that** queue state is consistent across the application  

**Acceptance Criteria:**
- Create `PlaybackQueueService` class for queue management
- Manage queue state in sessionStorage for current session
- Provide methods for queue navigation and state queries
- Handle edge cases (empty queue, single word, etc.)

## Technical Requirements

### New Service: PlaybackQueueService
```typescript
interface PlaybackQueueState {
  todayList: LearningProgress[];
  currentIndex: number;
  lastPlayedWords: string[]; // max 5 items
  isLooping: boolean;
}

class PlaybackQueueService {
  // Queue management
  initializeQueue(dailySelection: DailySelection): void;
  getCurrentWord(): LearningProgress | null;
  advanceToNext(): LearningProgress | null;
  
  // Spacing rules
  canPlayWord(word: LearningProgress): boolean;
  updateLastPlayed(word: LearningProgress): void;
  
  // State management
  getQueueState(): PlaybackQueueState;
  resetQueue(): void;
}
```

### Implementation Details
- **Storage**: Use `sessionStorage["playbackQueue"]` for queue state
- **Integration**: Connect with existing daily selection from Unit 2
- **Timing**: Integrate with Unit 1's time-based delays
- **Navigation**: Provide queue position and navigation methods

### Queue Logic Flow
1. **Initialize**: Load today's list from sessionStorage["todayList"]
2. **Check Eligibility**: Verify word meets timing and spacing requirements
3. **Advance**: Move to next eligible word in queue
4. **Loop**: Reset to index 0 when reaching end
5. **Update**: Track last played words and timing data

## Dependencies
- Depends on Unit 1 for time-based eligibility checks
- Depends on Unit 2 for enhanced daily selection
- Uses existing `LearningProgress` and `DailySelection` interfaces

## Definition of Done
- [ ] `PlaybackQueueService` class implemented
- [ ] Auto-advance functionality working
- [ ] Loop behavior implemented
- [ ] Five-item spacing rule enforced
- [ ] Unit tests for queue navigation and spacing rules
- [ ] Integration tests with daily selection and timing controls