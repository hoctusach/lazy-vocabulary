# Storage and Persistence Design

## Storage Strategy Decision
**Chosen Approach**: Hybrid approach with versioned storage - extends existing localStorage structure incrementally while providing migration capabilities.

## Enhanced localStorage Schema

### 1. Learning Progress Storage (Unit 1)

```json
{
  "learningProgress": {
    "wordKey1": {
      // Existing fields (preserved)
      "word": "example",
      "type": "phrasal verb",
      "category": "phrasal verbs",
      "isLearned": false,
      "reviewCount": 0,
      "lastPlayedDate": "2025-01-15",
      "status": "new",
      "nextReviewDate": "2025-01-15",
      "createdDate": "2025-01-15",
      
      // NEW: Enhanced timing fields
      "exposuresToday": 2,
      "lastExposureTime": "2025-01-15T14:30:00.000Z",
      "nextAllowedTime": "2025-01-15T14:37:00.000Z"
    }
  },
  "learningProgressVersion": "2.0",
  "lastExposureResetDate": "2025-01-15"
}
```

### 2. Daily Selection Storage (Unit 2)

```json
{
  // Session storage for current session
  "todayList": [
    // Array of word objects in final playback order
  ],
  
  // Persistent storage with date-specific keys
  "todayList_2025-01-15": {
    "newWords": [...],
    "reviewWords": [...],
    "totalCount": 35,
    "categoryArrangement": {
      "originalOrder": ["topic vocab", "topic vocab", "phrasal verbs"],
      "rearrangedOrder": ["topic vocab", "phrasal verbs", "topic vocab"],
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
  "lastSelectionDate": "2025-01-15",
  "dailySelectionVersion": "2.0"
}
```

### 3. Playback Queue Storage (Unit 3)

```json
// sessionStorage only (transient state)
{
  "playbackQueue": {
    "todayList": [...], // Reference to daily selection
    "currentIndex": 5,
    "lastPlayedWords": ["word1", "word2", "word3", "word4", "word5"],
    "isLooping": false,
    "loopCount": 0,
    "queueId": "queue_20250115_143022",
    "initializationTime": "2025-01-15T14:30:22.000Z",
    "lastAdvanceTime": "2025-01-15T14:35:10.000Z"
  },
  "playbackQueueVersion": "1.0"
}
```

### 4. Application Lifecycle Storage (Unit 4)

```json
{
  "appLifecycleState": {
    "lastInitDate": "2025-01-15",
    "lastInitialization": "2025-01-15T14:30:00.000Z",
    "componentsInitialized": ["learningProgress", "dailyScheduler", "playbackQueue", "uiIntegration"],
    "userPreferredSeverity": "moderate"
  },
  "lifecycleVersion": "1.0"
}
```

### 5. UI Integration Storage (Unit 5)

```json
// sessionStorage only (transient state)
{
  "uiIntegrationState": {
    "integrationActive": true,
    "lastButtonInteraction": "2025-01-15T14:35:00.000Z",
    "autoAdvanceEnabled": true,
    "originalHandlersStored": true
  },
  "uiIntegrationVersion": "1.0"
}
```

## Data Migration Strategies

### Version-Based Migration System

```typescript
interface MigrationStrategy {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => any;
  validate: (data: any) => boolean;
}

class StorageMigrationManager {
  private migrations: Map<string, MigrationStrategy[]> = new Map();
  
  registerMigration(storageKey: string, migration: MigrationStrategy): void {
    if (!this.migrations.has(storageKey)) {
      this.migrations.set(storageKey, []);
    }
    this.migrations.get(storageKey)!.push(migration);
  }
  
  async migrateStorage(storageKey: string): Promise<boolean> {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return true;
    
    try {
      let data = JSON.parse(stored);
      const currentVersion = data[`${storageKey}Version`] || '1.0';
      const targetVersion = this.getLatestVersion(storageKey);
      
      if (currentVersion === targetVersion) return true;
      
      // Apply migrations in sequence
      const migrations = this.getMigrationsPath(storageKey, currentVersion, targetVersion);
      
      for (const migration of migrations) {
        console.log(`Migrating ${storageKey} from ${migration.fromVersion} to ${migration.toVersion}`);
        data = migration.migrate(data);
        
        if (!migration.validate(data)) {
          throw new Error(`Migration validation failed for ${storageKey}`);
        }
      }
      
      // Update version and save
      data[`${storageKey}Version`] = targetVersion;
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      return true;
    } catch (error) {
      console.error(`Migration failed for ${storageKey}:`, error);
      return false;
    }
  }
}
```

### Specific Migration Implementations

```typescript
// Learning Progress Migration (1.0 → 2.0)
const learningProgressMigration: MigrationStrategy = {
  fromVersion: '1.0',
  toVersion: '2.0',
  migrate: (data: any) => {
    const progressData = data.learningProgress || {};
    
    // Add new timing fields to each word
    Object.keys(progressData).forEach(wordKey => {
      const progress = progressData[wordKey];
      if (!progress.exposuresToday) {
        progress.exposuresToday = 0;
        progress.lastExposureTime = '';
        progress.nextAllowedTime = new Date().toISOString();
      }
    });
    
    // Add new tracking fields
    if (!data.lastExposureResetDate) {
      data.lastExposureResetDate = new Date().toISOString().split('T')[0];
    }
    
    return data;
  },
  validate: (data: any) => {
    const progressData = data.learningProgress || {};
    return Object.values(progressData).every((progress: any) => 
      typeof progress.exposuresToday === 'number' &&
      typeof progress.lastExposureTime === 'string' &&
      typeof progress.nextAllowedTime === 'string'
    );
  }
};

// Daily Selection Migration (1.0 → 2.0)
const dailySelectionMigration: MigrationStrategy = {
  fromVersion: '1.0',
  toVersion: '2.0',
  migrate: (data: any) => {
    // Find existing daily selections and enhance them
    Object.keys(data).forEach(key => {
      if (key.startsWith('todayList_') && typeof data[key] === 'object') {
        const selection = data[key];
        
        // Add category arrangement info if missing
        if (!selection.categoryArrangement) {
          const allWords = [...(selection.newWords || []), ...(selection.reviewWords || [])];
          selection.categoryArrangement = {
            originalOrder: allWords.map(w => w.category),
            rearrangedOrder: allWords.map(w => w.category),
            streaksFixed: 0,
            maxConsecutiveCategory: this.calculateMaxConsecutive(allWords)
          };
        }
        
        // Add persistence info if missing
        if (!selection.persistenceInfo) {
          const date = key.replace('todayList_', '');
          selection.persistenceInfo = {
            sessionKey: 'todayList',
            persistentKey: key,
            generationDate: date,
            severity: 'moderate'
          };
        }
      }
    });
    
    return data;
  },
  validate: (data: any) => {
    // Validate enhanced daily selections
    return Object.keys(data).every(key => {
      if (key.startsWith('todayList_')) {
        const selection = data[key];
        return selection.categoryArrangement && selection.persistenceInfo;
      }
      return true;
    });
  }
};
```

## Storage Repository Implementations

### Learning Progress Repository

```typescript
class LearningProgressRepository implements ILearningProgressRepository {
  private readonly STORAGE_KEY = 'learningProgress';
  private readonly VERSION_KEY = 'learningProgressVersion';
  private readonly CURRENT_VERSION = '2.0';
  
  async getProgress(wordKey: string): Promise<EnhancedLearningProgress | null> {
    await this.ensureMigrated();
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored);
      return data[wordKey] || null;
    } catch (error) {
      console.error('Error loading progress:', error);
      return null;
    }
  }
  
  async saveProgress(progress: EnhancedLearningProgress): Promise<void> {
    await this.ensureMigrated();
    
    const stored = localStorage.getItem(this.STORAGE_KEY) || '{}';
    const data = JSON.parse(stored);
    
    data[progress.word] = progress;
    data[this.VERSION_KEY] = this.CURRENT_VERSION;
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  async getAllProgress(): Promise<Map<string, EnhancedLearningProgress>> {
    await this.ensureMigrated();
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return new Map();
    
    try {
      const data = JSON.parse(stored);
      const progressMap = new Map<string, EnhancedLearningProgress>();
      
      Object.entries(data).forEach(([key, value]) => {
        if (key !== this.VERSION_KEY && typeof value === 'object') {
          progressMap.set(key, value as EnhancedLearningProgress);
        }
      });
      
      return progressMap;
    } catch (error) {
      console.error('Error loading all progress:', error);
      return new Map();
    }
  }
  
  async migrateExistingData(): Promise<void> {
    const migrationManager = new StorageMigrationManager();
    migrationManager.registerMigration(this.STORAGE_KEY, learningProgressMigration);
    
    await migrationManager.migrateStorage(this.STORAGE_KEY);
  }
  
  private async ensureMigrated(): Promise<void> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return;
    
    const data = JSON.parse(stored);
    const version = data[this.VERSION_KEY];
    
    if (version !== this.CURRENT_VERSION) {
      await this.migrateExistingData();
    }
  }
}
```

### Daily Selection Repository

```typescript
class DailySelectionRepository implements IDailySelectionRepository {
  private readonly SESSION_KEY = 'todayList';
  private readonly VERSION_KEY = 'dailySelectionVersion';
  private readonly CURRENT_VERSION = '2.0';
  
  async getTodaySelection(): Promise<EnhancedDailySelection | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.getHistoricalSelection(today);
  }
  
  async saveSelection(selection: EnhancedDailySelection): Promise<void> {
    // Save to sessionStorage for current session
    const wordList = [...selection.newWords, ...selection.reviewWords];
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(wordList));
    
    // Save to localStorage with date-specific key
    const persistentKey = selection.persistenceInfo.persistentKey;
    const enhancedData = {
      ...selection,
      [this.VERSION_KEY]: this.CURRENT_VERSION
    };
    
    localStorage.setItem(persistentKey, JSON.stringify(enhancedData));
    localStorage.setItem('lastSelectionDate', selection.persistenceInfo.generationDate);
  }
  
  async getHistoricalSelection(date: string): Promise<EnhancedDailySelection | null> {
    const key = `todayList_${date}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored);
      
      // Check version and migrate if needed
      const version = data[this.VERSION_KEY];
      if (version !== this.CURRENT_VERSION) {
        await this.migrateSelection(key, data);
        return this.getHistoricalSelection(date); // Reload after migration
      }
      
      return data as EnhancedDailySelection;
    } catch (error) {
      console.error(`Error loading selection for ${date}:`, error);
      return null;
    }
  }
  
  private async migrateSelection(key: string, data: any): Promise<void> {
    const migrationManager = new StorageMigrationManager();
    migrationManager.registerMigration(key, dailySelectionMigration);
    
    await migrationManager.migrateStorage(key);
  }
}
```

### Playback Queue Repository

```typescript
class PlaybackQueueRepository implements IPlaybackQueueRepository {
  private readonly STORAGE_KEY = 'playbackQueue';
  private readonly VERSION_KEY = 'playbackQueueVersion';
  private readonly CURRENT_VERSION = '1.0';
  
  async getQueueState(): Promise<PlaybackQueueState | null> {
    const stored = sessionStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;
    
    try {
      const data = JSON.parse(stored);
      
      // Validate state integrity
      if (this.isValidState(data)) {
        return data as PlaybackQueueState;
      }
    } catch (error) {
      console.error('Error loading queue state:', error);
    }
    
    return null;
  }
  
  async saveQueueState(state: PlaybackQueueState): Promise<void> {
    try {
      const data = {
        ...state,
        [this.VERSION_KEY]: this.CURRENT_VERSION
      };
      
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving queue state:', error);
      // Handle sessionStorage quota exceeded
      this.handleStorageQuotaExceeded();
    }
  }
  
  async clearQueue(): Promise<void> {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
  
  private isValidState(state: any): state is PlaybackQueueState {
    return state &&
           Array.isArray(state.todayList) &&
           typeof state.currentIndex === 'number' &&
           Array.isArray(state.lastPlayedWords) &&
           state.lastPlayedWords.length <= 5 &&
           typeof state.queueId === 'string';
  }
  
  private handleStorageQuotaExceeded(): void {
    // Clear old queue data and retry
    this.clearQueue();
    console.warn('SessionStorage quota exceeded, cleared queue state');
  }
}
```

## Data Consistency and Synchronization

### Consistency Patterns

```typescript
class DataConsistencyManager {
  // Ensure consistency between sessionStorage and localStorage
  async syncStorageConsistency(): Promise<void> {
    // Check if sessionStorage todayList matches localStorage daily selection
    const sessionList = sessionStorage.getItem('todayList');
    const today = new Date().toISOString().split('T')[0];
    const persistentSelection = localStorage.getItem(`todayList_${today}`);
    
    if (sessionList && persistentSelection) {
      const sessionData = JSON.parse(sessionList);
      const persistentData = JSON.parse(persistentSelection);
      
      // Verify consistency
      const persistentWords = [...persistentData.newWords, ...persistentData.reviewWords];
      
      if (sessionData.length !== persistentWords.length) {
        console.warn('Storage inconsistency detected, resyncing...');
        await this.resyncStorages();
      }
    }
  }
  
  private async resyncStorages(): Promise<void> {
    // Reload from persistent storage as source of truth
    const today = new Date().toISOString().split('T')[0];
    const persistentSelection = localStorage.getItem(`todayList_${today}`);
    
    if (persistentSelection) {
      const data = JSON.parse(persistentSelection);
      const wordList = [...data.newWords, ...data.reviewWords];
      sessionStorage.setItem('todayList', JSON.stringify(wordList));
    }
  }
}
```

### Transaction-like Operations

```typescript
class StorageTransaction {
  private operations: (() => void)[] = [];
  private rollbackOperations: (() => void)[] = [];
  
  addOperation(operation: () => void, rollback: () => void): void {
    this.operations.push(operation);
    this.rollbackOperations.unshift(rollback); // Reverse order for rollback
  }
  
  async execute(): Promise<boolean> {
    try {
      // Execute all operations
      this.operations.forEach(op => op());
      return true;
    } catch (error) {
      console.error('Transaction failed, rolling back:', error);
      
      // Rollback in reverse order
      this.rollbackOperations.forEach(rollback => {
        try {
          rollback();
        } catch (rollbackError) {
          console.error('Rollback operation failed:', rollbackError);
        }
      });
      
      return false;
    }
  }
}
```

## Storage Optimization

### Compression for Large Data

```typescript
class StorageCompression {
  static compress(data: any): string {
    const jsonString = JSON.stringify(data);
    
    // Simple compression using repeated pattern replacement
    let compressed = jsonString
      .replace(/"word":/g, '"w":')
      .replace(/"category":/g, '"c":')
      .replace(/"isLearned":/g, '"l":')
      .replace(/"reviewCount":/g, '"r":')
      .replace(/"lastPlayedDate":/g, '"p":')
      .replace(/"exposuresToday":/g, '"e":')
      .replace(/"lastExposureTime":/g, '"t":');
    
    return compressed;
  }
  
  static decompress(compressed: string): any {
    // Reverse the compression
    const decompressed = compressed
      .replace(/"w":/g, '"word":')
      .replace(/"c":/g, '"category":')
      .replace(/"l":/g, '"isLearned":')
      .replace(/"r":/g, '"reviewCount":')
      .replace(/"p":/g, '"lastPlayedDate":')
      .replace(/"e":/g, '"exposuresToday":')
      .replace(/"t":/g, '"lastExposureTime":');
    
    return JSON.parse(decompressed);
  }
}
```

### Storage Cleanup

```typescript
class StorageCleanupManager {
  async cleanupOldData(): Promise<void> {
    // Remove daily selections older than 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('todayList_')) {
        const dateStr = key.replace('todayList_', '');
        try {
          const date = new Date(dateStr);
          if (date < cutoffDate) {
            localStorage.removeItem(key);
            console.log(`Cleaned up old selection: ${key}`);
          }
        } catch (error) {
          // Invalid date format, remove it
          localStorage.removeItem(key);
        }
      }
    });
  }
  
  async checkStorageQuota(): Promise<{ used: number; available: number }> {
    // Estimate localStorage usage
    let used = 0;
    Object.keys(localStorage).forEach(key => {
      used += localStorage.getItem(key)?.length || 0;
    });
    
    // Most browsers have ~5-10MB limit
    const estimated = used * 2; // Account for UTF-16 encoding
    const available = 5 * 1024 * 1024 - estimated; // 5MB estimate
    
    return { used: estimated, available };
  }
}