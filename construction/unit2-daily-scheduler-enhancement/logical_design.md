# Unit 2: Daily Learning Scheduler Enhancement - Logical Design

## Domain: Daily Scheduling

### Overview
Enhances existing `generateDailySelection()` with category repetition prevention and improved persistence while preserving all existing functionality.

## Architecture Components

### 1. Domain Model Alignment

```typescript
// Core aggregate root from domain model
interface EnhancedDailySelection extends DailySelection {
  // Existing fields preserved
  newWords: EnhancedLearningProgress[];
  reviewWords: EnhancedLearningProgress[];
  totalCount: number;
  
  // NEW: Category arrangement tracking
  categoryArrangement: CategoryArrangementInfo;
  persistenceInfo: PersistenceInfo;
}

// Value objects for domain logic
interface CategoryArrangementInfo {
  originalOrder: string[];
  rearrangedOrder: string[];
  streaksFixed: number;
  maxConsecutiveCategory: number;
}

interface PersistenceInfo {
  sessionKey: string;
  persistentKey: string;
  generationDate: string;
  severity: SeverityLevel;
}

interface CategoryDistribution {
  category: string;
  targetCount: number;
  actualCount: number;
  weight: number;
}
```

### 2. Repository Interface

```typescript
// Simple localStorage extension pattern
interface DailySelectionRepository {
  getTodaySelection(): EnhancedDailySelection | null;
  saveSelection(selection: EnhancedDailySelection): void;
  getHistoricalSelection(date: string): EnhancedDailySelection | null;
}

// Implementation using existing localStorage patterns
const dailySelectionRepository: DailySelectionRepository = {
  getTodaySelection(): EnhancedDailySelection | null {
    const today = new Date().toISOString().split('T')[0];
    const key = `todayList_${today}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  },
  
  saveSelection(selection: EnhancedDailySelection): void {
    // Save to sessionStorage for current session
    sessionStorage.setItem('todayList', JSON.stringify(selection.newWords.concat(selection.reviewWords)));
    
    // Save to localStorage with date-specific key
    const dateKey = `todayList_${selection.persistenceInfo.generationDate}`;
    localStorage.setItem(dateKey, JSON.stringify(selection));
    localStorage.setItem('lastSelectionDate', selection.persistenceInfo.generationDate);
  },
  
  getHistoricalSelection(date: string): EnhancedDailySelection | null {
    const key = `todayList_${date}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }
};
```

### 3. Enhanced Daily Selection Model

```typescript
interface EnhancedDailySelection extends DailySelection {
  // Existing fields preserved
  newWords: EnhancedLearningProgress[];
  reviewWords: EnhancedLearningProgress[];
  totalCount: number;
  
  // NEW: Category arrangement tracking
  categoryArrangement: {
    originalOrder: string[];
    rearrangedOrder: string[];
    streaksFixed: number;
    maxConsecutiveCategory: number;
  };
  
  // NEW: Enhanced persistence info
  persistenceInfo: {
    sessionKey: string;
    persistentKey: string;
    generationDate: string;
    severity: SeverityLevel;
  };
}
```

### 2. Service Enhancement

```typescript
class EnhancedDailyScheduler {
  // ENHANCED: Main generation method with FR3 filtering
  generateDailySelection(
    allWords: VocabularyWord[], 
    severity: SeverityLevel = 'moderate'
  ): EnhancedDailySelection;
  
  // NEW FR3: Word filtering methods
  private filterActiveWords(words: VocabularyWord[]): VocabularyWord[];
  private excludeRetiredWords(words: VocabularyWord[]): VocabularyWord[];
  private excludeMasteredWords(words: VocabularyWord[]): VocabularyWord[];
  private handleDailyQuota(wordKey: string): void; // FR3.1 quota logic
  
  // EXISTING: Category arrangement methods
  private rearrangeByCategory(words: EnhancedLearningProgress[]): {
    rearranged: EnhancedLearningProgress[];
    streaksFixed: number;
  };
  
  private detectCategoryStreaks(words: EnhancedLearningProgress[]): number[];
  private breakCategoryStreak(words: EnhancedLearningProgress[], streakStart: number): void;
  
  // EXISTING: Enhanced persistence methods
  private saveToSessionStorage(selection: EnhancedDailySelection): void;
  private saveToPersistentStorage(selection: EnhancedDailySelection): void;
  private generateStorageKeys(date: string): { sessionKey: string; persistentKey: string };
}
```

### 3. Category Arrangement Algorithm

```typescript
class CategoryArranger {
  rearrangeWords(words: EnhancedLearningProgress[]): {
    rearranged: EnhancedLearningProgress[];
    streaksFixed: number;
  } {
    const result = [...words];
    let streaksFixed = 0;
    
    // Detect streaks of 3+ consecutive same-category words
    for (let i = 0; i < result.length - 2; i++) {
      if (this.hasThreeConsecutiveCategories(result, i)) {
        this.breakStreak(result, i);
        streaksFixed++;
      }
    }
    
    return { rearranged: result, streaksFixed };
  }
  
  private hasThreeConsecutiveCategories(words: EnhancedLearningProgress[], startIndex: number): boolean {
    const category = words[startIndex].category;
    return words[startIndex + 1]?.category === category && 
           words[startIndex + 2]?.category === category;
  }
  
  private breakStreak(words: EnhancedLearningProgress[], streakStart: number): void {
    // Find a word with different category to swap
    for (let i = streakStart + 3; i < words.length; i++) {
      if (words[i].category !== words[streakStart].category) {
        [words[streakStart + 2], words[i]] = [words[i], words[streakStart + 2]];
        break;
      }
    }
  }
}
```

### 4. Enhanced Persistence Strategy

```typescript
class EnhancedPersistenceManager {
  saveSelection(selection: EnhancedDailySelection): void {
    // Save to sessionStorage for current session
    sessionStorage.setItem('todayList', JSON.stringify(selection.newWords.concat(selection.reviewWords)));
    
    // Save to localStorage with date-specific key
    const dateKey = `todayList_${selection.persistenceInfo.generationDate}`;
    localStorage.setItem(dateKey, JSON.stringify(selection));
    
    // Update tracking
    localStorage.setItem('lastSelectionDate', selection.persistenceInfo.generationDate);
  }
  
  loadSelection(date: string): EnhancedDailySelection | null {
    const dateKey = `todayList_${date}`;
    const stored = localStorage.getItem(dateKey);
    return stored ? JSON.parse(stored) : null;
  }
  
  cleanupOldSelections(): void {
    // Remove selections older than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('todayList_')) {
        const dateStr = key.replace('todayList_', '');
        if (new Date(dateStr) < cutoffDate) {
          localStorage.removeItem(key);
        }
      }
    });
  }
}
```

## Event-Driven Integration

### Events Published
- `DailyListGeneratedEvent`: When new daily list is created
- `CategoryRearrangedEvent`: When category streaks are fixed
- `ListPersistedEvent`: When list is saved to storage

### Events Consumed
- `DateChangedEvent`: Triggers new daily list generation
- `AppStartedEvent`: Checks if daily list needs generation
- `WordRetiredEvent`: Remove retired words from daily selection (FR3.2)
- `WordMasteredEvent`: Exclude mastered words from daily selection (FR3.4)
- `ReviewCompletedEvent`: Handle daily quota logic (FR3.1)

## FR3 Integration: Word Filtering

```typescript
class FR3WordFilter {
  filterWordsForDailySelection(allWords: VocabularyWord[]): VocabularyWord[] {
    return allWords.filter(word => {
      const progress = this.learningProgressService.getProgress(word.key);
      
      // FR3.2: Exclude retired words
      if (progress?.retired) return false;
      
      // FR3.4: Exclude mastered words from daily selection
      if (progress?.isMastered) return false;
      
      return true;
    });
  }
  
  handleDailyQuotaReached(wordKey: string): void {
    // FR3.1: Push nextReviewDate to next day if quota reached
    const progress = this.learningProgressService.getProgress(wordKey);
    if (progress?.nextReviewDate) {
      const nextDate = new Date(progress.nextReviewDate);
      nextDate.setDate(nextDate.getDate() + 1);
      progress.nextReviewDate = nextDate.toISOString().split('T')[0];
      this.learningProgressService.saveProgress(wordKey, progress);
    }
  }
  
  onWordRetired(wordKey: string): void {
    // Remove from current daily selection if present
    this.removeFromCurrentSelection(wordKey);
  }
  
  onWordMastered(wordKey: string): void {
    // Remove from current daily selection if present
    this.removeFromCurrentSelection(wordKey);
  }
}
```

## Enhanced Generation Flow

```typescript
class EnhancedGenerationFlow {
  async generateDailySelection(allWords: VocabularyWord[], severity: SeverityLevel): Promise<EnhancedDailySelection> {
    // 1. Check if already generated today
    const today = new Date().toISOString().split('T')[0];
    const existing = this.persistenceManager.loadSelection(today);
    if (existing) return existing;
    
    // 2. NEW FR3: Filter out retired and mastered words
    const activeWords = this.fr3Filter.filterWordsForDailySelection(allWords);
    
    // 3. Generate selection using existing logic with filtered words
    const baseSelection = await this.baseGenerator.generateSelection(activeWords, severity);
    
    // 3. Apply category rearrangement
    const allWords = [...baseSelection.newWords, ...baseSelection.reviewWords];
    const { rearranged, streaksFixed } = this.categoryArranger.rearrangeWords(allWords);
    
    // 4. Split back into new/review
    const newWords = rearranged.filter(w => !w.isLearned);
    const reviewWords = rearranged.filter(w => w.isLearned);
    
    // 5. Create enhanced selection
    const enhancedSelection: EnhancedDailySelection = {
      newWords,
      reviewWords,
      totalCount: rearranged.length,
      categoryArrangement: {
        originalOrder: allWords.map(w => w.category),
        rearrangedOrder: rearranged.map(w => w.category),
        streaksFixed,
        maxConsecutiveCategory: this.calculateMaxConsecutive(rearranged)
      },
      persistenceInfo: {
        sessionKey: 'todayList',
        persistentKey: `todayList_${today}`,
        generationDate: today,
        severity
      }
    };
    
    // 6. Persist selection
    this.persistenceManager.saveSelection(enhancedSelection);
    
    // 7. Publish events
    this.eventBus.publish(new DailyListGeneratedEvent(enhancedSelection));
    if (streaksFixed > 0) {
      this.eventBus.publish(new CategoryRearrangedEvent(enhancedSelection.categoryArrangement));
    }
    
    return enhancedSelection;
  }
}
```

## Storage Schema

### sessionStorage
```json
{
  "todayList": [
    // Array of EnhancedLearningProgress objects in final order
  ]
}
```

### localStorage
```json
{
  "todayList_2025-01-15": {
    "newWords": [...],
    "reviewWords": [...],
    "totalCount": 35,
    "categoryArrangement": {
      "originalOrder": ["topic vocab", "topic vocab", "phrasal verbs", ...],
      "rearrangedOrder": ["topic vocab", "phrasal verbs", "topic vocab", ...],
      "streaksFixed": 2,
      "maxConsecutiveCategory": 2
    },
    "persistenceInfo": {
      "sessionKey": "todayList",
      "persistentKey": "todayList_2025-01-15",
      "generationDate": "2025-01-15",
      "severity": "moderate"
    }
  },
  "lastSelectionDate": "2025-01-15"
}
```

## Integration Points

### With Existing Services
- **Extends**: `LearningProgressService.generateDailySelection()`
- **Preserves**: All existing selection logic and ratios
- **Maintains**: Backward compatibility with existing storage

### With Other Units
- **Unit 1**: Uses enhanced progress data with timing fields
- **Unit 3**: Provides arranged word list for playback queue
- **Unit 4**: Receives generation triggers from lifecycle events

## Validation Rules

### Category Arrangement
- No more than 2 consecutive words from same category
- Preserve as much of original random order as possible
- Validate arrangement before persistence

### Data Integrity
- Ensure totalCount matches actual word count
- Validate date formats and storage keys
- Check category distribution maintains original ratios

## Testing Strategy

### Unit Tests
- Category streak detection accuracy
- Rearrangement algorithm correctness
- Storage key generation
- Backward compatibility

### Integration Tests
- End-to-end generation flow
- Event publishing/consuming
- Storage persistence and retrieval

## Performance Considerations

### Optimization
- Efficient streak detection algorithm
- Minimal memory allocation during rearrangement
- Lazy loading of historical selections

### Scalability
- Handle large word lists efficiently
- Optimize storage cleanup operations
- Batch processing for multiple operations