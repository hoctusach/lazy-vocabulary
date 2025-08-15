# Unit 5: Playback Integration Layer - Domain Model (Minimal)

## Overview
Extends existing button integration patterns with minimal retirement functionality. Based on existing `VocabularyCard` component structure.

## Domain Concepts (Minimal Extension)

### Existing Button Integration (Already Implemented)
```typescript
// Already in VocabularyCard.tsx
interface VocabularyCardProps {
  // Existing button handlers (no changes needed)
  onToggleMute: () => void;
  onTogglePause: () => void;
  onNextWord: () => void;
  onCycleVoice: () => void;
  onSwitchCategory: () => void;
  
  // NEW: Add retirement handler (minimal addition)
  onRetireWord?: () => void;
}
```

### NEW: Retirement Extension (Minimal)
```typescript
// Extend existing LearningProgress interface
interface LearningProgress {
  // ... all existing fields unchanged ...
  
  // NEW: Retirement fields (minimal addition)
  retired?: boolean;              // Default: false
  retiredDate?: string | null;    // Default: null
  nextMaintenanceDate?: string | null; // Default: null
}

// NEW: Simple retirement logic
const retireWord = (wordKey: string) => {
  const today = new Date().toISOString().split('T')[0];
  const nextMaintenance = new Date();
  nextMaintenance.setDate(nextMaintenance.getDate() + 100);
  
  // Extend existing updateWordProgress pattern
  learningProgressService.retireWord(wordKey, {
    retired: true,
    retiredDate: today,
    nextMaintenanceDate: nextMaintenance.toISOString().split('T')[0]
  });
};
```

## Tactical DDD Components (Minimal)

### Aggregates (Extend Existing)
- **LearningProgressService**: Add `retireWord()` method
- **LearningProgress**: Add retirement fields

### Value Objects (Minimal)
```typescript
// Simple retirement status
type RetirementStatus = {
  retired: boolean;
  retiredDate: string | null;
  nextMaintenanceDate: string | null;
};

// 100-day maintenance constant
const MAINTENANCE_INTERVAL_DAYS = 100;
```

### Domain Services (Extend Existing)
```typescript
// Extend existing LearningProgressService
class LearningProgressService {
  // ... all existing methods unchanged ...
  
  // NEW: Minimal retirement methods
  retireWord(wordKey: string, retirementData: RetirementStatus): void {
    const progressMap = this.getLearningProgress();
    const progress = progressMap.get(wordKey);
    
    if (progress) {
      Object.assign(progress, retirementData);
      progressMap.set(wordKey, progress);
      this.saveLearningProgress(progressMap);
    }
  }
  
  isWordRetired(wordKey: string): boolean {
    const progress = this.getWordProgress(wordKey);
    return progress?.retired || false;
  }
}
```

### Repositories (Extend Existing)
- Uses existing `getLearningProgress()` and `saveLearningProgress()` methods
- No new repository needed - just extend existing localStorage schema

## UI Integration (Minimal Addition)

### Extend Existing VocabularyCard
```typescript
// Add to existing VocabularyCard.tsx (minimal change)
const VocabularyCard: React.FC<VocabularyCardProps> = ({
  // ... all existing props ...
  onRetireWord, // NEW: Optional retirement handler
}) => {
  return (
    <Card>
      {/* ... all existing content unchanged ... */}
      
      {/* NEW: Add retire button (minimal addition) */}
      {onRetireWord && (
        <Button 
          onClick={onRetireWord}
          title="Got it, DO NOT show"
          size="sm"
          variant="outline"
        >
          🚫
        </Button>
      )}
    </Card>
  );
};
```

### Integration with Existing Hooks
```typescript
// Extend existing useLearningProgress.tsx (minimal)
export const useLearningProgress = (allWords: VocabularyWord[]) => {
  // ... all existing functionality unchanged ...
  
  // NEW: Add retirement handler (minimal)
  const retireCurrentWord = useCallback((word: string) => {
    learningProgressService.retireWord(word, {
      retired: true,
      retiredDate: new Date().toISOString().split('T')[0],
      nextMaintenanceDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    refreshStats();
  }, [refreshStats]);
  
  return {
    // ... all existing returns ...
    retireCurrentWord // NEW: Add to return object
  };
};
```

## Storage Schema Extension (Minimal)

### localStorage Extension
```json
{
  "learningProgress": {
    "wordKey": {
      // ... all existing fields unchanged ...
      "word": "example",
      "isLearned": false,
      "reviewCount": 0,
      
      // NEW: Retirement fields (optional, backward compatible)
      "retired": false,
      "retiredDate": null,
      "nextMaintenanceDate": null
    }
  }
}
```

## Integration Points (Minimal Changes)

### With Existing Components
- **VocabularyCard**: Add optional `onRetireWord` prop
- **useLearningProgress**: Add `retireCurrentWord` method
- **LearningProgressService**: Add `retireWord` and `isWordRetired` methods

### With Existing Filtering
- Extend existing word filtering to exclude retired words
- Use existing patterns in `generateDailySelection`

## Implementation Strategy (Minimal Impact)

### What's New (Minimal)
1. **1 new button**: Retire button in VocabularyCard
2. **3 new fields**: retirement data in localStorage
3. **2 new methods**: `retireWord()` and `isWordRetired()`
4. **1 new prop**: `onRetireWord` callback

### What's Unchanged (Everything Else)
- All existing button functionality
- All existing UI layout and styling
- All existing business logic and hooks
- All existing integration patterns
- All existing localStorage structure

## Summary
Unit 5 extends existing patterns with **absolute minimum** retirement functionality:
- Reuses existing `LearningProgressService` and `useLearningProgress`
- Adds optional retirement button to existing `VocabularyCard`
- Extends existing localStorage schema with 3 optional fields
- Maintains full backward compatibility

**Total new code**: ~20 lines across 3 existing files.