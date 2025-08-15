# Unit 1: Enhanced Spaced Repetition Engine

## Overview
Extends the existing `LearningProgressService` to add intra-day spacing controls and time-based repetition delays as specified in FR2.5.

## User Stories

### US1.1: Intra-day Exposure Tracking
**As a** learner  
**I want** the system to track how many times I've heard each word today  
**So that** words don't repeat too frequently within a single session  

**Acceptance Criteria:**
- Add `exposuresToday` field to existing `LearningProgress` interface
- Reset `exposuresToday` to 0 at midnight (new day)
- Increment `exposuresToday` each time a word is played
- Store exposure count in localStorage with existing progress data

### US1.2: Time-based Repetition Delays
**As a** learner  
**I want** recently played words to have increasing delays before they can appear again  
**So that** I don't hear the same word too frequently in a short time  

**Acceptance Criteria:**
- Add `lastExposureTime` field to track when word was last played
- Add `nextAllowedTime` calculated field for next eligible play time
- Implement delay schedule: [0, 5, 7, 10, 15, 30, 60, 90, 120] minutes based on `exposuresToday`
- Only include words in queue if `current time >= nextAllowedTime`

### US1.3: Enhanced Progress Data Structure
**As a** developer  
**I want** the existing `LearningProgress` interface extended with new timing fields  
**So that** intra-day spacing can be implemented without breaking existing functionality  

**Acceptance Criteria:**
- Extend existing `LearningProgress` interface with new fields:
  - `exposuresToday: number`
  - `lastExposureTime: string` (ISO timestamp)
  - `nextAllowedTime: string` (ISO timestamp)
- Maintain backward compatibility with existing progress data
- Migrate existing progress records to include new fields with default values

## Technical Requirements

### Data Model Extension
```typescript
// Extend existing LearningProgress interface
interface LearningProgress {
  // ... existing fields remain unchanged
  word: string;
  type?: string;
  category: string;
  isLearned: boolean;
  reviewCount: number;
  lastPlayedDate: string;
  status: 'due' | 'not_due' | 'new';
  nextReviewDate: string;
  createdDate: string;
  
  // NEW FIELDS for intra-day spacing
  exposuresToday: number;
  lastExposureTime: string;
  nextAllowedTime: string;
}
```

### Implementation Details
- **Service**: Extend `LearningProgressService.updateWordProgress()`
- **Storage**: Use existing localStorage key `'learningProgress'`
- **Migration**: Auto-migrate existing records on first load
- **Reset Logic**: Clear `exposuresToday` at midnight using date comparison

## Dependencies
- Extends existing `LearningProgressService`
- Uses existing `LearningProgress` interface
- Maintains compatibility with existing localStorage structure

## Definition of Done
- [ ] New fields added to `LearningProgress` interface
- [ ] `LearningProgressService` updated with timing logic
- [ ] Existing progress data migrated automatically
- [ ] Unit tests for delay calculation and exposure tracking
- [ ] Integration tests with existing spaced repetition logic