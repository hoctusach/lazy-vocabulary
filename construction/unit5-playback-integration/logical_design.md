# Unit 5: Playback Integration Layer - Logical Design

## Domain: User Interface Integration

### Overview
Connects existing VocabularyCard control buttons with enhanced playback queue system without changing the UI, ensuring seamless integration of new functionality while preserving all existing behavior.

## Architecture Components

### 1. UI Integration State Model

```typescript
interface UIIntegrationState {
  currentWord: EnhancedLearningProgress | null;
  isAudioPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  autoAdvanceEnabled: boolean;
  lastButtonInteraction: string;
  integrationActive: boolean;
}

interface ButtonInteraction {
  buttonType: 'NEXT' | 'PAUSE' | 'PLAY' | 'MUTE' | 'VOICE' | 'CATEGORY' | 'RETIRE';
  timestamp: string;
  wordKey: string;
  resultingAction: string;
  success: boolean;
}
```

### 2. Integration Service Implementation

```typescript
class PlaybackIntegrationService {
  private state: UIIntegrationState;
  private readonly playbackQueue: PlaybackQueueService;
  private readonly progressCoordinator: ProgressUpdateCoordinator;
  
  constructor() {
    this.state = {
      currentWord: null,
      isAudioPlaying: false,
      isPaused: false,
      isMuted: false,
      autoAdvanceEnabled: true,
      lastButtonInteraction: '',
      integrationActive: false
    };
  }
  
  // Connect with existing VocabularyCard handlers
  connectWithVocabularyCard(): void {
    this.integrationActive = true;
    
    // Hook into existing button handlers without changing UI
    this.enhanceExistingHandlers();
    
    // Set up audio completion detection
    this.setupAudioCompletionDetection();
    
    // Initialize with current queue state
    this.syncWithQueue();
    
    // Set up retirement functionality
    this.setupRetirementIntegration();
  }
  
  // Enhanced button handlers (preserve existing behavior)
  handleNextClick(): void {
    const interaction: ButtonInteraction = {
      buttonType: 'NEXT',
      timestamp: new Date().toISOString(),
      wordKey: this.state.currentWord?.word || '',
      resultingAction: '',
      success: false
    };
    
    try {
      // 1. Call original next handler (preserve existing behavior)
      this.callOriginalNextHandler();
      
      // 2. Integrate with queue system
      const navigation = this.playbackQueue.advanceToNext(false);
      
      if (navigation.canAdvance) {
        // Update current word
        this.state.currentWord = navigation.nextWord;
        
        // Update progress for manually advanced word
        if (this.state.currentWord) {
          this.progressCoordinator.updateWordProgress(
            this.state.currentWord.word, 
            'MANUAL_ADVANCE'
          );
        }
        
        interaction.resultingAction = 'ADVANCED_TO_NEXT';
        interaction.success = true;
      } else {
        // Show user feedback about why advance failed
        this.showAdvanceBlockedFeedback(navigation.skipReason);
        interaction.resultingAction = `BLOCKED_${navigation.skipReason}`;
        interaction.success = false;
      }
      
    } catch (error) {
      console.error('Next button integration error:', error);
      interaction.resultingAction = 'ERROR';
    }
    
    this.publishEvent(new ButtonClickedEvent(interaction));
  }
  
  handleRetireClick(wordKey: string): void {
    const interaction: ButtonInteraction = {
      buttonType: 'RETIRE',
      timestamp: new Date().toISOString(),
      wordKey: wordKey,
      resultingAction: '',
      success: false
    };
    
    try {
      // Update word status to retired in localStorage
      this.progressCoordinator.retireWord(wordKey);
      
      // Remove from current daily selection if present
      this.playbackQueue.removeRetiredWord(wordKey);
      
      // Advance to next word if current word was retired
      if (this.state.currentWord?.word === wordKey) {
        const navigation = this.playbackQueue.advanceToNext(false);
        if (navigation.canAdvance) {
          this.state.currentWord = navigation.nextWord;
        }
      }
      
      interaction.resultingAction = 'WORD_RETIRED';
      interaction.success = true;
      
    } catch (error) {
      console.error('Retire button integration error:', error);
      interaction.resultingAction = 'ERROR';
    }
    
    this.publishEvent(new ButtonClickedEvent(interaction));
  }
  
  handlePausePlayClick(isPaused: boolean): void {
    const interaction: ButtonInteraction = {
      buttonType: isPaused ? 'PLAY' : 'PAUSE',
      timestamp: new Date().toISOString(),
      wordKey: this.state.currentWord?.word || '',
      resultingAction: '',
      success: false
    };
    
    try {
      // 1. Call original pause/play handler
      this.callOriginalPausePlayHandler(isPaused);
      
      // 2. Update integration state
      this.state.isPaused = !isPaused;
      this.state.isAudioPlaying = isPaused;
      
      // 3. Control auto-advance based on pause state
      this.state.autoAdvanceEnabled = !this.state.isPaused;
      
      interaction.resultingAction = isPaused ? 'RESUMED' : 'PAUSED';
      interaction.success = true;
      
    } catch (error) {
      console.error('Pause/Play integration error:', error);
      interaction.resultingAction = 'ERROR';
    }
    
    this.publishEvent(new ButtonClickedEvent(interaction));
  }
}
```

### 3. Audio Completion Detection

```typescript
class AudioCompletionDetector {
  private speechSynthesis: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private completionCallback: ((wordKey: string) => void) | null = null;
  
  setupDetection(): void {
    // Hook into existing speech synthesis system
    this.speechSynthesis = window.speechSynthesis;
    
    // Override existing utterance creation to add completion detection
    this.enhanceUtteranceCreation();
  }
  
  private enhanceUtteranceCreation(): void {
    // Intercept utterance creation in existing speech system
    const originalSpeak = this.speechSynthesis.speak.bind(this.speechSynthesis);
    
    this.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
      this.currentUtterance = utterance;
      
      // Add completion handler
      utterance.onend = (event) => {
        this.handleAudioCompletion();
      };
      
      // Add error handler
      utterance.onerror = (event) => {
        console.warn('Speech synthesis error:', event);
        this.handleAudioCompletion(); // Still trigger completion
      };
      
      // Call original speak method
      originalSpeak(utterance);
    };
  }
  
  private handleAudioCompletion(): void {
    if (this.completionCallback && this.integrationService.state.currentWord) {
      const wordKey = this.integrationService.state.currentWord.word;
      
      // Update progress for completed word
      this.progressCoordinator.updateWordProgress(wordKey, 'COMPLETION');
      
      // Trigger auto-advance if enabled
      if (this.integrationService.state.autoAdvanceEnabled) {
        this.handleAutoAdvance(wordKey);
      }
      
      // Publish completion event
      this.publishEvent(new AudioCompletedEvent({
        wordKey,
        completionTime: new Date().toISOString(),
        autoAdvance: this.integrationService.state.autoAdvanceEnabled
      }));
    }
  }
  
  private handleAutoAdvance(completedWordKey: string): void {
    // Small delay to ensure smooth transition
    setTimeout(() => {
      const navigation = this.playbackQueue.advanceToNext(true);
      
      if (navigation.canAdvance && navigation.nextWord) {
        // Update current word
        this.integrationService.state.currentWord = navigation.nextWord;
        
        // Trigger playback of next word (integrate with existing system)
        this.triggerWordPlayback(navigation.nextWord);
        
        // Update progress
        this.progressCoordinator.updateWordProgress(
          navigation.nextWord.word, 
          'AUTO_ADVANCE'
        );
      }
    }, 500); // 500ms delay for smooth transition
  }
}
```

### 4. Existing Handler Enhancement

```typescript
class ExistingHandlerEnhancer {
  private originalHandlers: Map<string, Function> = new Map();
  
  enhanceHandlers(): void {
    // Store references to original handlers
    this.storeOriginalHandlers();
    
    // Enhance without replacing
    this.enhanceNextHandler();
    this.enhancePauseHandler();
    this.enhanceMuteHandler();
    this.enhanceVoiceHandler();
    this.enhanceCategoryHandler();
  }
  
  private storeOriginalHandlers(): void {
    // Store original handlers from VocabularyCard props
    const vocabularyCard = this.findVocabularyCardInstance();
    if (vocabularyCard) {
      this.originalHandlers.set('onNextWord', vocabularyCard.props.onNextWord);
      this.originalHandlers.set('onTogglePause', vocabularyCard.props.onTogglePause);
      this.originalHandlers.set('onToggleMute', vocabularyCard.props.onToggleMute);
      this.originalHandlers.set('onCycleVoice', vocabularyCard.props.onCycleVoice);
      this.originalHandlers.set('onSwitchCategory', vocabularyCard.props.onSwitchCategory);
    }
  }
  
  private enhanceNextHandler(): void {
    const original = this.originalHandlers.get('onNextWord');
    if (original) {
      // Create enhanced handler that calls original first
      const enhanced = () => {
        // Call original handler first (preserve existing behavior)
        original();
        
        // Then add integration logic
        this.integrationService.handleNextClick();
      };
      
      // Replace handler in component (without changing UI)
      this.replaceHandler('onNextWord', enhanced);
    }
  }
  
  private enhancePauseHandler(): void {
    const original = this.originalHandlers.get('onTogglePause');
    if (original) {
      const enhanced = () => {
        const wasPaused = this.integrationService.state.isPaused;
        
        // Call original handler first
        original();
        
        // Add integration logic
        this.integrationService.handlePausePlayClick(wasPaused);
      };
      
      this.replaceHandler('onTogglePause', enhanced);
    }
  }
}
```

### 5. Progress Tracking Integration

```typescript
class ProgressTrackingIntegrator {
  trackButtonInteraction(interaction: ButtonInteraction): void {
    // Create progress tracking record
    const tracking: UIProgressTracking = {
      wordKey: interaction.wordKey,
      actionType: this.mapButtonToActionType(interaction.buttonType),
      timestamp: interaction.timestamp,
      progressBefore: this.getCurrentWordProgress(interaction.wordKey),
      progressAfter: null // Will be updated after progress change
    };
    
    // Store for later completion
    this.pendingTracking.set(interaction.wordKey, tracking);
    
    // Publish tracking event
    this.publishEvent(new ProgressTrackedEvent({
      wordKey: interaction.wordKey,
      actionType: tracking.actionType
    }));
  }
  
  completeProgressTracking(wordKey: string): void {
    const tracking = this.pendingTracking.get(wordKey);
    if (tracking) {
      tracking.progressAfter = this.getCurrentWordProgress(wordKey);
      
      // Log progress change for analytics
      this.logProgressChange(tracking);
      
      // Clean up
      this.pendingTracking.delete(wordKey);
    }
  }
  
  private mapButtonToActionType(buttonType: string): 'MANUAL_ADVANCE' | 'AUTO_ADVANCE' | 'COMPLETION' | 'RETIREMENT' {
    switch (buttonType) {
      case 'NEXT':
        return 'MANUAL_ADVANCE';
      case 'RETIRE':
        return 'RETIREMENT';
      default:
        return 'COMPLETION';
    }
  }
}
```

## Integration Flow

```
User Clicks Button
    ↓
Enhanced Handler Called
    ↓
Original Handler Executed (UI unchanged)
    ↓
Integration Logic Applied
    ↓
Queue Navigation Checked
    ↓
Progress Updated
    ↓
Events Published
    ↓
UI State Synchronized

Audio Completion Detected
    ↓
Progress Updated
    ↓
Auto-Advance Triggered (if enabled)
    ↓
Next Word Loaded
    ↓
Playback Started
    ↓
Events Published
```

## Event-Driven Integration

### Events Published
- `ButtonClickedEvent`: When any button is clicked
- `AudioCompletedEvent`: When audio playback finishes
- `ProgressTrackedEvent`: When progress is updated via UI
- `WordRetiredEvent`: When a word is retired via UI

### Events Consumed
- `WordAdvancedEvent`: Update UI state when queue advances
- `QueueInitializedEvent`: Sync with new queue state
- `SpacingRuleAppliedEvent`: Show user feedback for blocked actions
- `WordRetiredEvent`: Update queue when word is retired

## Backward Compatibility Preservation

### UI Preservation
```typescript
class UIPreservationLayer {
  ensureNoVisualChanges(): void {
    // Verify no CSS changes
    this.validateCSSIntegrity();
    
    // Verify no component structure changes
    this.validateComponentStructure();
    
    // Verify all original props preserved
    this.validatePropsIntegrity();
  }
  
  validateOriginalBehavior(): void {
    // Test that all original button behaviors work
    this.testOriginalNextBehavior();
    this.testOriginalPauseBehavior();
    this.testOriginalMuteBehavior();
    this.testOriginalVoiceBehavior();
    this.testOriginalCategoryBehavior();
  }
}
```

### Graceful Degradation
```typescript
class GracefulDegradation {
  handleIntegrationFailure(): void {
    // If integration fails, fall back to original behavior
    this.restoreOriginalHandlers();
    this.disableIntegrationFeatures();
    this.logDegradationEvent();
  }
  
  restoreOriginalHandlers(): void {
    // Restore all original button handlers
    this.originalHandlers.forEach((handler, key) => {
      this.replaceHandler(key, handler);
    });
  }
}
```

## Testing Strategy

### UI Integration Tests
- Verify no visual changes to VocabularyCard
- Test all button behaviors preserved
- Validate enhanced functionality works
- Test graceful degradation

### Event Flow Tests
- Button click event propagation
- Audio completion detection
- Progress update integration
- Queue synchronization

### Backward Compatibility Tests
- Original functionality preserved
- No breaking changes to existing code
- Graceful handling of integration failures

## Performance Considerations

### Minimal Overhead
- Lightweight handler enhancement
- Efficient event propagation
- Minimal memory footprint for integration state

### Optimization
- Lazy loading of integration features
- Efficient audio completion detection
- Batch progress updates where possible