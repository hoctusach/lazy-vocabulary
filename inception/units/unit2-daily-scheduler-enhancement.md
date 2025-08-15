# Unit 2: Daily Learning Scheduler Enhancement

## Overview
Enhances the existing `generateDailySelection()` function to prevent category repetition and improve word arrangement as specified in FR2.4.

## User Stories

### US2.1: Category Repetition Prevention
**As a** learner  
**I want** no more than 2 consecutive words from the same category in my daily list  
**So that** I get better variety and don't get bored with similar content  

**Acceptance Criteria:**
- Analyze generated daily list for category streaks
- Rearrange words to break streaks of 3+ consecutive same-category words
- Preserve most of the original random order while fixing category issues
- Apply rearrangement before saving to sessionStorage and localStorage

### US2.2: Enhanced Daily List Persistence
**As a** learner  
**I want** my daily word list saved with date-specific keys  
**So that** I can track historical daily selections and ensure consistency  

**Acceptance Criteria:**
- Save daily list to `sessionStorage["todayList"]` for current session
- Also persist to `localStorage["todayList_YYYYMMDD"]` for historical tracking
- Use current date in YYYY-MM-DD format for localStorage key
- Load from appropriate storage based on current date

### US2.3: Improved List Generation Logic
**As a** developer  
**I want** the existing daily selection enhanced with better word arrangement  
**So that** the learning experience is more varied and engaging  

**Acceptance Criteria:**
- Extend existing `generateDailySelection()` method in `LearningProgressService`
- Add category analysis and rearrangement step
- Maintain existing 40% new / 60% review ratio logic
- Preserve existing severity levels (light, moderate, intense)
- Keep existing category weight distribution for new words

## Technical Requirements

### Enhanced Generation Flow
1. **Generate Selection** (existing logic)
   - Apply severity-based count selection
   - Enforce 40% new / 60% review ratio
   - Use existing category weights for new words
   - Apply existing fallback logic

2. **Category Rearrangement** (NEW)
   - Analyze consecutive categories in generated list
   - Identify streaks of 3+ same-category words
   - Rearrange to break streaks while preserving order
   - Validate final arrangement meets requirements

3. **Enhanced Persistence** (MODIFIED)
   - Save to sessionStorage["todayList"]
   - Save to localStorage["todayList_" + YYYY-MM-DD]
   - Update lastSelectionDate tracking

### Implementation Details
- **Service**: Extend `LearningProgressService.generateDailySelection()`
- **New Method**: `private rearrangeByCategory(words: LearningProgress[]): LearningProgress[]`
- **Storage Keys**: 
  - Session: `"todayList"`
  - Persistent: `"todayList_YYYYMMDD"`
- **Validation**: Ensure no 3+ consecutive same-category words

## Dependencies
- Extends existing `LearningProgressService.generateDailySelection()`
- Uses existing `DailySelection` interface
- Depends on Unit 1 for enhanced `LearningProgress` structure

## Definition of Done
- [ ] Category rearrangement logic implemented
- [ ] Enhanced persistence with date-specific keys
- [ ] Existing daily selection logic preserved
- [ ] Unit tests for category streak detection and rearrangement
- [ ] Integration tests with existing selection ratios and weights