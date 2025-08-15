# Integration and Testing Design

## React Component Integration Patterns

### Hook-Based Integration

```typescript
// Custom hook for learning progress integration
function useLearningProgressIntegration() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentWord, setCurrentWord] = useState<EnhancedLearningProgress | null>(null);
  const [queueState, setQueueState] = useState<PlaybackQueueState | null>(null);
  
  const integrator = useMemo(() => 
    ServiceFactory.getInstance().getService<ILearningProgressIntegratorService>('integrator'),
    []
  );
  
  useEffect(() => {
    const initializeIntegration = async () => {
      try {
        await integrator.initializeOnAppStart();
        setIsInitialized(true);
      } catch (error) {
        console.error('Integration initialization failed:', error);
      }
    };
    
    initializeIntegration();
  }, [integrator]);
  
  const updateWordProgress = useCallback(async (
    wordKey: string, 
    actionType: 'MANUAL_ADVANCE' | 'AUTO_ADVANCE' | 'COMPLETION'
  ) => {
    await integrator.updateWordProgress(wordKey, actionType);
  }, [integrator]);
  
  return {
    isInitialized,
    currentWord,
    queueState,
    updateWordProgress
  };
}

// Enhanced VocabularyCard integration
function useEnhancedVocabularyCard(originalProps: VocabularyCardProps) {
  const { updateWordProgress } = useLearningProgressIntegration();
  const playbackIntegration = useRef<IPlaybackIntegrationService>();
  
  useEffect(() => {
    playbackIntegration.current = ServiceFactory.getInstance()
      .getService<IPlaybackIntegrationService>('playbackIntegration');
    
    playbackIntegration.current.connectWithVocabularyCard();
  }, []);
  
  // Enhanced handlers that preserve original behavior
  const enhancedHandlers = useMemo(() => ({
    onNextWord: async () => {
      // Call original handler first
      originalProps.onNextWord();
      
      // Add integration logic
      await playbackIntegration.current?.handleNextClick();
    },
    
    onTogglePause: async () => {
      const wasPaused = originalProps.isPaused;
      
      // Call original handler first
      originalProps.onTogglePause();
      
      // Add integration logic
      await playbackIntegration.current?.handlePausePlayClick(wasPaused);
    },
    
    // Preserve other handlers unchanged
    onToggleMute: originalProps.onToggleMute,
    onCycleVoice: originalProps.onCycleVoice,
    onSwitchCategory: originalProps.onSwitchCategory
  }), [originalProps]);
  
  return {
    ...originalProps,
    ...enhancedHandlers
  };
}
```

### Component Wrapper Pattern

```typescript
// Higher-Order Component for integration
function withLearningProgressIntegration<P extends VocabularyCardProps>(
  WrappedComponent: React.ComponentType<P>
) {
  return function EnhancedComponent(props: P) {
    const enhancedProps = useEnhancedVocabularyCard(props);
    
    return <WrappedComponent {...enhancedProps} />;
  };
}

// Usage
const EnhancedVocabularyCard = withLearningProgressIntegration(VocabularyCard);
```

## Backward Compatibility Layers

### Compatibility Validator

```typescript
class BackwardCompatibilityValidator {
  private originalBehaviors: Map<string, any> = new Map();
  
  captureOriginalBehaviors(): void {
    // Capture original VocabularyCard behavior
    this.originalBehaviors.set('vocabularyCard', {
      buttonCount: this.countButtons(),
      cssClasses: this.getCSSClasses(),
      propTypes: this.getPropTypes()
    });
    
    // Capture original service behaviors
    this.originalBehaviors.set('learningProgressService', {
      methods: Object.getOwnPropertyNames(LearningProgressService.prototype),
      storageKeys: this.getStorageKeys()
    });
  }
  
  validateCompatibility(): boolean {
    let isCompatible = true;
    
    // Validate UI compatibility
    if (!this.validateUICompatibility()) {
      console.error('UI compatibility validation failed');
      isCompatible = false;
    }
    
    // Validate service compatibility
    if (!this.validateServiceCompatibility()) {
      console.error('Service compatibility validation failed');
      isCompatible = false;
    }
    
    // Validate storage compatibility
    if (!this.validateStorageCompatibility()) {
      console.error('Storage compatibility validation failed');
      isCompatible = false;
    }
    
    return isCompatible;
  }
  
  private validateUICompatibility(): boolean {
    const current = {
      buttonCount: this.countButtons(),
      cssClasses: this.getCSSClasses(),
      propTypes: this.getPropTypes()
    };
    
    const original = this.originalBehaviors.get('vocabularyCard');
    
    return current.buttonCount === original.buttonCount &&
           this.arraysEqual(current.cssClasses, original.cssClasses) &&
           this.objectsEqual(current.propTypes, original.propTypes);
  }
}
```

### Graceful Degradation

```typescript
class GracefulDegradationManager {
  private fallbackMode = false;
  
  enableFallbackMode(): void {
    this.fallbackMode = true;
    console.warn('Enabling fallback mode - enhanced features disabled');
    
    // Disable enhanced features
    this.disableEnhancedFeatures();
    
    // Restore original behaviors
    this.restoreOriginalBehaviors();
  }
  
  private disableEnhancedFeatures(): void {
    // Disable timing controls
    const learningProgress = ServiceFactory.getInstance()
      .getService<IEnhancedLearningProgressService>('learningProgress');
    
    // Override enhanced methods with no-ops
    learningProgress.updateWordExposure = async () => {};
    learningProgress.resetDailyExposures = async () => {};
    
    // Disable queue management
    const playbackQueue = ServiceFactory.getInstance()
      .getService<IPlaybackQueueService>('playbackQueue');
    
    playbackQueue.advanceToNext = async () => ({ canAdvance: false, nextIndex: -1, nextWord: null });
  }
  
  private restoreOriginalBehaviors(): void {
    // Restore original VocabularyCard handlers
    const originalHandlers = this.getStoredOriginalHandlers();
    this.applyHandlers(originalHandlers);
  }
}
```

## Testing Strategies

### Unit Testing Framework

```typescript
// Test utilities for enhanced services
class TestUtils {
  static createMockEnhancedLearningProgress(): EnhancedLearningProgress {
    return {
      word: 'test',
      type: 'noun',
      category: 'topic vocab',
      isLearned: false,
      reviewCount: 0,
      lastPlayedDate: '',
      status: 'new',
      nextReviewDate: '2025-01-15',
      createdDate: '2025-01-15',
      exposuresToday: 0,
      lastExposureTime: '',
      nextAllowedTime: '2025-01-15T14:30:00.000Z'
    };
  }
  
  static createMockDailySelection(): EnhancedDailySelection {
    return {
      newWords: [this.createMockEnhancedLearningProgress()],
      reviewWords: [],
      totalCount: 1,
      categoryArrangement: {
        originalOrder: ['topic vocab'],
        rearrangedOrder: ['topic vocab'],
        streaksFixed: 0,
        maxConsecutiveCategory: 1
      },
      persistenceInfo: {
        sessionKey: 'todayList',
        persistentKey: 'todayList_2025-01-15',
        generationDate: '2025-01-15',
        severity: 'moderate'
      }
    };
  }
  
  static setupMockLocalStorage(): void {
    const mockStorage = new Map<string, string>();
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockStorage.get(key) || null,
        setItem: (key: string, value: string) => mockStorage.set(key, value),
        removeItem: (key: string) => mockStorage.delete(key),
        clear: () => mockStorage.clear()
      }
    });
  }
}

// Unit tests for Enhanced Learning Progress Service
describe('EnhancedLearningProgressService', () => {
  let service: EnhancedLearningProgressService;
  let mockTimingCalculator: jest.Mocked<ITimingCalculatorService>;
  let mockEventBus: jest.Mocked<EventBus>;
  
  beforeEach(() => {
    TestUtils.setupMockLocalStorage();
    
    mockTimingCalculator = {
      calculateDelay: jest.fn(),
      addMinutes: jest.fn(),
      isTimeElapsed: jest.fn(),
      getCurrentTimestamp: jest.fn()
    };
    
    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    };
    
    service = new EnhancedLearningProgressService(
      mockTimingCalculator,
      {} as IDailyResetService,
      mockEventBus
    );
  });
  
  describe('updateWordExposure', () => {
    it('should increment exposure count and update timing', async () => {
      // Arrange
      const wordKey = 'test';
      const mockProgress = TestUtils.createMockEnhancedLearningProgress();
      jest.spyOn(service, 'getWordProgress').mockResolvedValue(mockProgress);
      jest.spyOn(service, 'saveProgress').mockResolvedValue();
      
      mockTimingCalculator.getCurrentTimestamp.mockReturnValue('2025-01-15T14:30:00.000Z');
      mockTimingCalculator.calculateDelay.mockReturnValue(5);
      mockTimingCalculator.addMinutes.mockReturnValue('2025-01-15T14:35:00.000Z');
      
      // Act
      await service.updateWordExposure(wordKey);
      
      // Assert
      expect(mockProgress.exposuresToday).toBe(1);
      expect(mockProgress.lastExposureTime).toBe('2025-01-15T14:30:00.000Z');
      expect(mockEventBus.publish).toHaveBeenCalledWith({
        type: 'WORD_EXPOSED',
        payload: {
          wordKey,
          exposureTime: '2025-01-15T14:30:00.000Z',
          exposureCount: 1
        }
      });
    });
  });
});
```

### Integration Testing

```typescript
// Integration tests for complete flow
describe('Learning Progress Integration Flow', () => {
  let integrator: LearningProgressIntegrator;
  let mockServices: any;
  
  beforeEach(async () => {
    // Setup mock services
    mockServices = {
      learningProgress: new MockEnhancedLearningProgressService(),
      dailyScheduler: new MockEnhancedDailySchedulerService(),
      playbackQueue: new MockPlaybackQueueService(),
      uiIntegration: new MockPlaybackIntegrationService()
    };
    
    // Initialize service factory with mocks
    const serviceFactory = ServiceFactory.getInstance();
    Object.entries(mockServices).forEach(([name, service]) => {
      serviceFactory.registerService(name, service);
    });
    
    integrator = new LearningProgressIntegrator();
  });
  
  describe('App Startup Flow', () => {
    it('should initialize all components in correct order', async () => {
      // Act
      await integrator.initializeOnAppStart();
      
      // Assert
      expect(mockServices.learningProgress.migrateExistingData).toHaveBeenCalled();
      expect(mockServices.dailyScheduler.generateDailySelection).toHaveBeenCalled();
      expect(mockServices.playbackQueue.initializeQueue).toHaveBeenCalled();
      expect(mockServices.uiIntegration.connectWithVocabularyCard).toHaveBeenCalled();
    });
    
    it('should handle date change correctly', async () => {
      // Arrange
      localStorage.setItem('lastAppInitDate', '2025-01-14');
      
      // Act
      const dateChanged = await integrator.checkDateChange();
      
      // Assert
      expect(dateChanged).toBe(true);
      expect(mockServices.learningProgress.resetDailyExposures).toHaveBeenCalled();
      expect(mockServices.dailyScheduler.generateDailySelection).toHaveBeenCalled();
    });
  });
  
  describe('Word Playback Flow', () => {
    it('should handle complete word playback cycle', async () => {
      // Arrange
      const wordKey = 'test';
      const mockWord = TestUtils.createMockEnhancedLearningProgress();
      mockServices.playbackQueue.getCurrentWord.mockResolvedValue(mockWord);
      mockServices.playbackQueue.advanceToNext.mockResolvedValue({
        canAdvance: true,
        nextIndex: 1,
        nextWord: mockWord
      });
      
      // Act - Simulate audio completion
      await integrator.updateWordProgress(wordKey, 'COMPLETION');
      
      // Assert
      expect(mockServices.learningProgress.updateWordProgress).toHaveBeenCalledWith(wordKey);
      expect(mockServices.learningProgress.updateWordExposure).toHaveBeenCalledWith(wordKey);
    });
  });
});
```

### End-to-End Testing

```typescript
// E2E tests using real localStorage and components
describe('End-to-End Learning Progress Flow', () => {
  let container: HTMLElement;
  
  beforeEach(() => {
    // Setup real DOM environment
    container = document.createElement('div');
    document.body.appendChild(container);
    
    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();
  });
  
  afterEach(() => {
    document.body.removeChild(container);
  });
  
  it('should complete full learning session flow', async () => {
    // Arrange - Render VocabularyApp with real services
    const { getByText, getByRole } = render(<VocabularyApp />, { container });
    
    // Wait for initialization
    await waitFor(() => {
      expect(getByText(/vocabulary/i)).toBeInTheDocument();
    });
    
    // Act - Click Next button
    const nextButton = getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    // Assert - Check that progress was updated
    await waitFor(() => {
      const progressData = localStorage.getItem('learningProgress');
      expect(progressData).toBeTruthy();
      
      const progress = JSON.parse(progressData!);
      const firstWord = Object.values(progress)[0] as any;
      expect(firstWord.exposuresToday).toBeGreaterThan(0);
    });
    
    // Assert - Check that queue state was updated
    const queueState = sessionStorage.getItem('playbackQueue');
    expect(queueState).toBeTruthy();
    
    const queue = JSON.parse(queueState!);
    expect(queue.currentIndex).toBeGreaterThanOrEqual(0);
  });
  
  it('should handle date change correctly', async () => {
    // Arrange - Set up data from previous day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    localStorage.setItem('lastAppInitDate', yesterdayStr);
    localStorage.setItem(`todayList_${yesterdayStr}`, JSON.stringify({
      newWords: [TestUtils.createMockEnhancedLearningProgress()],
      reviewWords: [],
      totalCount: 1
    }));
    
    // Act - Initialize app (should detect date change)
    const { getByText } = render(<VocabularyApp />, { container });
    
    // Wait for initialization and date change handling
    await waitFor(() => {
      expect(getByText(/vocabulary/i)).toBeInTheDocument();
    });
    
    // Assert - Check that new daily selection was generated
    const today = new Date().toISOString().split('T')[0];
    const todaySelection = localStorage.getItem(`todayList_${today}`);
    expect(todaySelection).toBeTruthy();
    
    // Assert - Check that exposure counts were reset
    const progressData = localStorage.getItem('learningProgress');
    if (progressData) {
      const progress = JSON.parse(progressData);
      Object.values(progress).forEach((word: any) => {
        if (typeof word === 'object' && word.exposuresToday !== undefined) {
          expect(word.exposuresToday).toBe(0);
        }
      });
    }
  });
});
```

### Performance Testing

```typescript
describe('Performance Tests', () => {
  it('should handle large vocabulary sets efficiently', async () => {
    // Arrange - Create large dataset
    const largeVocabularySet = Array.from({ length: 10000 }, (_, i) => ({
      word: `word${i}`,
      meaning: `meaning${i}`,
      example: `example${i}`,
      category: ['topic vocab', 'phrasal verbs', 'idioms'][i % 3]
    }));
    
    const service = new EnhancedDailySchedulerService(
      new CategoryArrangementService(),
      new EnhancedPersistenceService(),
      new EnhancedLearningProgressService(),
      new EventBus()
    );
    
    // Act & Assert - Measure performance
    const startTime = performance.now();
    
    const selection = await service.generateDailySelection(largeVocabularySet, 'moderate');
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (< 1 second)
    expect(duration).toBeLessThan(1000);
    expect(selection.totalCount).toBeGreaterThan(0);
    expect(selection.categoryArrangement.streaksFixed).toBeGreaterThanOrEqual(0);
  });
  
  it('should handle localStorage operations efficiently', async () => {
    // Arrange - Create large progress dataset
    const largeProgressData = new Map<string, EnhancedLearningProgress>();
    
    for (let i = 0; i < 5000; i++) {
      largeProgressData.set(`word${i}`, {
        ...TestUtils.createMockEnhancedLearningProgress(),
        word: `word${i}`
      });
    }
    
    const repository = new LearningProgressRepository();
    
    // Act & Assert - Measure storage operations
    const startTime = performance.now();
    
    // Save all progress data
    for (const [key, progress] of largeProgressData) {
      await repository.saveProgress(progress);
    }
    
    // Load all progress data
    const loadedData = await repository.getAllProgress();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(2000); // 2 seconds
    expect(loadedData.size).toBe(5000);
  });
});
```

## Deployment and Monitoring

### Feature Flags

```typescript
class FeatureFlags {
  private static flags = {
    enhancedSpacedRepetition: true,
    categoryRearrangement: true,
    playbackQueue: true,
    autoAdvance: true,
    timingControls: true
  };
  
  static isEnabled(feature: keyof typeof FeatureFlags.flags): boolean {
    return FeatureFlags.flags[feature] && !this.isInFallbackMode();
  }
  
  static disable(feature: keyof typeof FeatureFlags.flags): void {
    FeatureFlags.flags[feature] = false;
    console.warn(`Feature ${feature} has been disabled`);
  }
  
  private static isInFallbackMode(): boolean {
    return localStorage.getItem('fallbackMode') === 'true';
  }
}
```

### Error Monitoring

```typescript
class ErrorMonitor {
  private static errorCounts = new Map<string, number>();
  private static readonly ERROR_THRESHOLD = 5;
  
  static reportError(component: string, error: Error): void {
    const key = `${component}:${error.name}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
    
    // Log error details
    console.error(`Error in ${component}:`, error);
    
    // Check if threshold exceeded
    if (count + 1 >= this.ERROR_THRESHOLD) {
      this.handleCriticalError(component, error);
    }
  }
  
  private static handleCriticalError(component: string, error: Error): void {
    console.error(`Critical error threshold exceeded in ${component}`);
    
    // Disable related features
    switch (component) {
      case 'EnhancedLearningProgressService':
        FeatureFlags.disable('enhancedSpacedRepetition');
        FeatureFlags.disable('timingControls');
        break;
      case 'PlaybackQueueService':
        FeatureFlags.disable('playbackQueue');
        FeatureFlags.disable('autoAdvance');
        break;
    }
    
    // Enable fallback mode if too many components fail
    const failedComponents = Array.from(this.errorCounts.keys())
      .filter(key => this.errorCounts.get(key)! >= this.ERROR_THRESHOLD);
    
    if (failedComponents.length >= 2) {
      localStorage.setItem('fallbackMode', 'true');
      window.location.reload(); // Restart in fallback mode
    }
  }
}