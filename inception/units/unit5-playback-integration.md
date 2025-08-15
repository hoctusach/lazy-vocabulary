# Unit 5: Playback Integration Layer

## Overview
Connects existing VocabularyCard control buttons with enhanced playback queue system without changing the UI, ensuring seamless integration of new functionality.

## User Stories

### US5.1: Enhanced Next Button Integration
**As a** learner  
**I want** the existing Next button to work with the new playback queue system  
**So that** I can manually advance through my daily word list  

**Acceptance Criteria:**
- Connect existing `onNextWord()` handler with playback queue
- Advance to next eligible word in queue when Next button is clicked
- Update word progress when manually advancing
- Maintain existing button appearance and behavior

### US5.2: Auto-Advance Integration
**As a** learner  
**I want** automatic advancement to work seamlessly with existing audio playback  
**So that** I get continuous learning without manual intervention  

**Acceptance Criteria:**
- Detect when audio playback completes (word + meaning + example)
- Automatically trigger queue advancement
- Update progress for completed word
- Maintain existing audio playback functionality

### US5.3: Pause/Play Integration
**As a** learner  
**I want** the existing Pause/Play button to work with queue management  
**So that** I can control my learning session timing  

**Acceptance Criteria:**
- Pause button stops current audio and queue advancement
- Play button resumes from current queue position
- Maintain existing pause/play button states and appearance
- Preserve existing audio control functionality

### US5.4: Progress Tracking Integration
**As a** developer  
**I want** word completion events connected to progress updates  
**So that** spaced repetition data is updated automatically  

**Acceptance Criteria:**
- Trigger progress update when word playback completes
- Update timing fields (`exposuresToday`, `lastExposureTime`) 
- Update spaced repetition fields (`reviewCount`, `nextReviewDate`)
- Maintain existing progress tracking functionality

## Technical Requirements

### Integration Points
```typescript
// Extend existing VocabularyCard props (no UI changes)
interface VocabularyCardProps {
  // ... all existing props remain unchanged
  
  // NEW: Optional integration callbacks (internal use)
  onWordComplete?: (word: string) => void;
  onQueueAdvance?: () => void;
}

// Integration service
class PlaybackIntegrationService {
  // Button integration
  handleNextClick(): void;
  handlePlaybackComplete(): void;
  
  // Progress integration
  updateWordProgress(word: LearningProgress): void;
  
  // Queue integration
  connectWithQueue(): void;
}
```

### Implementation Details
- **No UI Changes**: VocabularyCard appearance remains identical
- **Handler Enhancement**: Extend existing button click handlers
- **Event Integration**: Connect audio completion events with queue advancement
- **Progress Updates**: Automatic progress tracking on word completion

### Integration Flow
1. **Button Click**: Existing handlers call integration service
2. **Queue Check**: Verify next word eligibility (timing + spacing rules)
3. **Advance**: Move to next eligible word in queue
4. **Update**: Record progress for completed word
5. **Display**: Show new word using existing VocabularyCard

### Preserved Functionality
- **All Buttons**: Mute, Pause, Next, Switch Category, Voice buttons unchanged
- **Audio Playback**: Existing speech synthesis integration maintained
- **Visual Design**: No changes to card layout, colors, or styling
- **User Experience**: Same interaction patterns and behaviors

## Dependencies
- Integrates with Units 1-4 functionality
- Uses existing VocabularyCard component without modifications
- Connects with existing audio playback system
- Maintains existing button handler patterns

## Definition of Done
- [ ] Button handlers connected to queue system
- [ ] Auto-advance working with existing audio playback
- [ ] Progress updates triggered on word completion
- [ ] All existing VocabularyCard functionality preserved
- [ ] No visual changes to VocabularyCard UI
- [ ] Integration tests with existing button behaviors
- [ ] End-to-end tests for complete playback flow