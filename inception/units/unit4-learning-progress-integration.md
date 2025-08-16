# Unit 4: Learning Progress Integration

## Overview
Integrates enhanced learning progress functionality with app lifecycle and provides triggers for daily list regeneration as specified in FR2.2.

## User Stories

### US4.1: App Launch List Generation
**As a** learner  
**I want** a fresh daily word list generated when I start the app  
**So that** I always have an appropriate selection of words to study  

**Acceptance Criteria:**
- Detect app cold start (first load of the day)
- Generate daily list if none exists for current date
 - Use existing severity preference or default to 'light'
- Initialize playback queue with generated list

### US4.2: Date Change Detection
**As a** learner  
**I want** a new daily word list when the date changes  
**So that** I get fresh content each day even if I keep the app open  

**Acceptance Criteria:**
- Compare current date with `lastSelectionDate` in localStorage
- Trigger new daily list generation if dates differ
- Update all date-dependent progress tracking
- Reset intra-day counters (`exposuresToday`) for all words

### US4.3: Progress Update Integration
**As a** learner  
**I want** my word progress updated automatically when I complete studying a word  
**So that** the spaced repetition system works correctly  

**Acceptance Criteria:**
- Update word progress after each complete playback (word + meaning + example)
- Increment `reviewCount` and update `nextReviewDate` using existing logic
- Update new timing fields (`exposuresToday`, `lastExposureTime`, `nextAllowedTime`)
- Persist progress changes to localStorage immediately

### US4.4: Learning Progress Panel Integration
**As a** learner  
**I want** the existing progress panel to show updated statistics  
**So that** I can track my learning progress accurately  

**Acceptance Criteria:**
- Refresh progress statistics when daily list is regenerated
- Update progress panel when word progress changes
- Show current daily selection information
- Maintain existing progress panel functionality

## Technical Requirements

### New Service: LearningProgressIntegrator
```typescript
class LearningProgressIntegrator {
  // App lifecycle
  initializeOnAppStart(): Promise<void>;
  checkDateChange(): boolean;
  
  // Progress updates
  updateWordProgress(word: LearningProgress): void;
  refreshProgressStats(): void;
  
  // Integration points
  connectWithPlaybackQueue(): void;
  connectWithProgressPanel(): void;
}
```

### Implementation Details
- **App Integration**: Hook into existing app startup sequence
- **Date Tracking**: Use existing `lastSelectionDate` in localStorage
- **Progress Updates**: Extend existing `LearningProgressService.updateWordProgress()`
- **Panel Integration**: Connect with existing `LearningProgressPanel` component

### Integration Flow
1. **App Start**: Check if daily list exists for current date
2. **Date Check**: Compare current date with stored `lastSelectionDate`
3. **Generate**: Create new daily list if needed using enhanced scheduler
4. **Initialize**: Set up playback queue with daily selection
5. **Connect**: Link progress updates with playback completion events

### Trigger Points
- **App Launch**: `useEffect` in main app component
- **Date Change**: Periodic check or visibility change detection
- **Word Completion**: After audio playback finishes
- **Manual Refresh**: User action in progress panel

## Dependencies
- Integrates Units 1, 2, and 3 functionality
- Uses existing `LearningProgressService` and `LearningProgressPanel`
- Connects with existing app lifecycle hooks

## Definition of Done
- [ ] `LearningProgressIntegrator` service implemented
- [ ] App startup integration working
- [ ] Date change detection functional
- [ ] Progress updates connected to playback completion
- [ ] Progress panel integration maintained
- [ ] Unit tests for integration logic
- [ ] End-to-end tests for complete learning flow