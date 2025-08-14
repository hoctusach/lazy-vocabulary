# Data Migration Unit - Domain Model

## Domain Overview
Manages one-time migration of local user data to cloud storage with conflict resolution and data validation.

## Aggregates

### MigrationSession Aggregate
**Root Entity**: MigrationSession
**Consistency Boundary**: Complete migration process for a single user
**Invariants**:
- Each user can have only one active migration session
- Migration is idempotent (safe to run multiple times)
- All local data must be validated before migration

### LocalDataSnapshot Aggregate
**Root Entity**: LocalDataSnapshot
**Consistency Boundary**: Complete local data state at migration time
**Invariants**:
- Snapshot is immutable once created
- Contains complete user progress history
- Maintains data integrity from local storage

## Entities

### MigrationSession (Aggregate Root)
```
MigrationSession {
  - sessionId: MigrationSessionId (Identity)
  - userId: UserId
  - status: MigrationStatus (Value Object)
  - localDataSnapshot: LocalDataSnapshot
  - migrationResult: MigrationResult (Value Object)
  - startedAt: DateTime
  - completedAt: DateTime
  - deviceInfo: DeviceInfo (Value Object)
}
```

### LocalDataSnapshot (Aggregate Root)
```
LocalDataSnapshot {
  - snapshotId: SnapshotId (Identity)
  - userId: UserId
  - progressData: List<LocalProgressData> (Value Object)
  - userPreferences: LocalUserPreferences (Value Object)
  - createdAt: DateTime
  - dataVersion: String
  - checksum: String
}
```

### DataConflict (Entity)
```
DataConflict {
  - conflictId: ConflictId (Identity)
  - sessionId: MigrationSessionId
  - wordId: WordId
  - localData: LocalProgressData
  - serverData: UserProgress
  - resolution: ConflictResolution (Value Object)
  - resolvedAt: DateTime
}
```

## Value Objects

### MigrationStatus
```
MigrationStatus {
  - status: Status (enum: PENDING, IN_PROGRESS, COMPLETED, FAILED)
  - progress: Float (0.0 to 1.0)
  - currentStep: String
  - errorMessage: String (optional)
}
```

### LocalProgressData
```
LocalProgressData {
  - wordId: WordId
  - reviewCount: Integer
  - correctCount: Integer
  - lastReviewedAt: DateTime
  - srsInterval: Integer
  - easeFactor: Float
  - validate(): Boolean
}
```

### LocalUserPreferences
```
LocalUserPreferences {
  - dailyGoal: Integer
  - preferredCategories: List<String>
  - notificationSettings: Map<String, Boolean>
  - lastSyncAt: DateTime
}
```

### MigrationResult
```
MigrationResult {
  - totalItems: Integer
  - migratedItems: Integer
  - skippedItems: Integer
  - conflictCount: Integer
  - errors: List<String>
  - summary: String
}
```

### ConflictResolution
```
ConflictResolution {
  - strategy: ResolutionStrategy (enum: USE_LOCAL, USE_SERVER, MERGE)
  - resolvedData: UserProgress
  - reason: String
}
```

### MigrationConfig
```
MigrationConfig {
  - batchSize: Integer
  - conflictStrategy: ResolutionStrategy
  - validateData: Boolean
  - createBackup: Boolean
}
```

## Domain Events

### MigrationStarted
```
MigrationStarted {
  - sessionId: MigrationSessionId
  - userId: UserId
  - totalItems: Integer
  - startedAt: DateTime
}
```

### LocalDataDetected
```
LocalDataDetected {
  - userId: UserId
  - dataVersion: String
  - itemCount: Integer
  - detectedAt: DateTime
}
```

### DataConflictDetected
```
DataConflictDetected {
  - conflictId: ConflictId
  - sessionId: MigrationSessionId
  - wordId: WordId
  - conflictType: ConflictType (enum)
  - detectedAt: DateTime
}
```

### MigrationCompleted
```
MigrationCompleted {
  - sessionId: MigrationSessionId
  - userId: UserId
  - result: MigrationResult
  - completedAt: DateTime
}
```

### MigrationFailed
```
MigrationFailed {
  - sessionId: MigrationSessionId
  - userId: UserId
  - errorMessage: String
  - failedAt: DateTime
}
```

## Policies

### DataValidationPolicy
Validates local data integrity before migration

### ConflictResolutionPolicy
Defines rules for resolving data conflicts during migration

### MigrationSafetyPolicy
Ensures migration process doesn't corrupt existing data

### OneTimeMigrationPolicy
Prevents duplicate migrations for the same user

## Repositories

### MigrationSessionRepository
```
MigrationSessionRepository {
  - findById(sessionId: MigrationSessionId): MigrationSession
  - findByUser(userId: UserId): MigrationSession
  - findActiveSession(userId: UserId): MigrationSession
  - save(session: MigrationSession): void
  - markCompleted(sessionId: MigrationSessionId): void
}
```

### LocalDataSnapshotRepository
```
LocalDataSnapshotRepository {
  - findById(snapshotId: SnapshotId): LocalDataSnapshot
  - findByUser(userId: UserId): LocalDataSnapshot
  - save(snapshot: LocalDataSnapshot): void
  - delete(snapshotId: SnapshotId): void
}
```

### DataConflictRepository
```
DataConflictRepository {
  - findBySession(sessionId: MigrationSessionId): List<DataConflict>
  - findUnresolved(): List<DataConflict>
  - save(conflict: DataConflict): void
  - markResolved(conflictId: ConflictId, resolution: ConflictResolution): void
}
```

## Domain Services

### LocalDataDetectionService
```
LocalDataDetectionService {
  - detectLocalData(userId: UserId): LocalDataSnapshot
  - validateLocalData(snapshot: LocalDataSnapshot): ValidationResult
  - createSnapshot(localData: Map<String, Object>): LocalDataSnapshot
}
```

### MigrationOrchestrationService
```
MigrationOrchestrationService {
  - startMigration(userId: UserId, config: MigrationConfig): MigrationSession
  - processMigrationBatch(session: MigrationSession, batch: List<LocalProgressData>): BatchResult
  - completeMigration(sessionId: MigrationSessionId): MigrationResult
}
```

### ConflictResolutionService
```
ConflictResolutionService {
  - detectConflicts(localData: LocalProgressData, serverData: UserProgress): List<DataConflict>
  - resolveConflict(conflict: DataConflict, strategy: ResolutionStrategy): ConflictResolution
  - mergeProgressData(local: LocalProgressData, server: UserProgress): UserProgress
}
```

### DataTransformationService
```
DataTransformationService {
  - transformLocalToServer(localData: LocalProgressData): UserProgress
  - validateTransformation(original: LocalProgressData, transformed: UserProgress): Boolean
  - createMigrationSummary(result: MigrationResult): String
}
```