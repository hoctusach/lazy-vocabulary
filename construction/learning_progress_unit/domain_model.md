# Learning Progress Unit - Domain Model

## Domain Overview
Tracks user learning progress, manages spaced repetition scheduling, and handles real-time synchronization.

## Aggregates

### UserProgress Aggregate
**Root Entity**: UserProgress
**Consistency Boundary**: All progress data for a single user
**Invariants**:
- User can have only one progress record per vocabulary word
- Review events are immutable once recorded
- SRS intervals must be positive values

### ReviewSession Aggregate
**Root Entity**: ReviewSession
**Consistency Boundary**: Single review session and all its events
**Invariants**:
- Session must have at least one review event
- All events in session belong to same user
- Session duration calculated from first to last event

## Entities

### UserProgress (Aggregate Root)
```
UserProgress {
  - progressId: ProgressId (Identity)
  - userId: UserId
  - wordId: WordId
  - srsData: SRSData (Value Object)
  - totalReviews: Integer
  - correctReviews: Integer
  - lastReviewedAt: DateTime
  - nextReviewAt: DateTime
  - createdAt: DateTime
  - updatedAt: DateTime
}
```

### ReviewSession (Aggregate Root)
```
ReviewSession {
  - sessionId: SessionId (Identity)
  - userId: UserId
  - startedAt: DateTime
  - completedAt: DateTime
  - deviceInfo: DeviceInfo (Value Object)
  - events: List<ReviewEvent>
}
```

### ReviewEvent (Entity)
```
ReviewEvent {
  - eventId: EventId (Identity)
  - sessionId: SessionId
  - wordId: WordId
  - response: ReviewResponse (Value Object)
  - responseTime: Duration
  - occurredAt: DateTime
}
```

## Value Objects

### SRSData
```
SRSData {
  - interval: Integer (days)
  - easeFactor: Float
  - repetitions: Integer
  - calculateNextInterval(response: ReviewResponse): Integer
  - updateEaseFactor(response: ReviewResponse): Float
}
```

### ReviewResponse
```
ReviewResponse {
  - isCorrect: Boolean
  - confidence: ConfidenceLevel (enum: LOW, MEDIUM, HIGH)
  - validate(): Boolean
}
```

### ConfidenceLevel
```
enum ConfidenceLevel {
  LOW, MEDIUM, HIGH
}
```

### DailyListConfig
```
DailyListConfig {
  - maxNewWords: Integer
  - maxReviewWords: Integer
  - reviewPriority: ReviewPriority (enum)
  - validate(): Boolean
}
```

### SyncTimestamp
```
SyncTimestamp {
  - value: DateTime
  - deviceId: String
  - isAfter(other: SyncTimestamp): Boolean
}
```

## Domain Events

### ReviewEventRecorded
```
ReviewEventRecorded {
  - eventId: EventId
  - userId: UserId
  - wordId: WordId
  - response: ReviewResponse
  - responseTime: Duration
  - occurredAt: DateTime
}
```

### ProgressUpdated
```
ProgressUpdated {
  - progressId: ProgressId
  - userId: UserId
  - wordId: WordId
  - previousSRSData: SRSData
  - newSRSData: SRSData
  - occurredAt: DateTime
}
```

### DailyListGenerated
```
DailyListGenerated {
  - userId: UserId
  - listDate: Date
  - newWords: List<WordId>
  - reviewWords: List<WordId>
  - generatedAt: DateTime
}
```

### ProgressSynchronized
```
ProgressSynchronized {
  - userId: UserId
  - syncedItems: Integer
  - conflicts: Integer
  - syncTimestamp: SyncTimestamp
}
```

## Policies

### SRSSchedulingPolicy
Implements spaced repetition algorithm for optimal review timing

### ConflictResolutionPolicy
Resolves conflicts during multi-device synchronization using timestamps

### DailyListGenerationPolicy
Balances new words and reviews based on user performance and preferences

## Repositories

### UserProgressRepository
```
UserProgressRepository {
  - findByUserAndWord(userId: UserId, wordId: WordId): UserProgress
  - findByUser(userId: UserId): List<UserProgress>
  - findDueForReview(userId: UserId, date: Date): List<UserProgress>
  - save(progress: UserProgress): void
  - saveAll(progressList: List<UserProgress>): void
}
```

### ReviewSessionRepository
```
ReviewSessionRepository {
  - findById(sessionId: SessionId): ReviewSession
  - findByUser(userId: UserId, dateRange: DateRange): List<ReviewSession>
  - save(session: ReviewSession): void
}
```

### ReviewEventRepository
```
ReviewEventRepository {
  - findBySession(sessionId: SessionId): List<ReviewEvent>
  - findByUser(userId: UserId, dateRange: DateRange): List<ReviewEvent>
  - save(event: ReviewEvent): void
  - saveAll(events: List<ReviewEvent>): void
}
```

## Domain Services

### SRSAlgorithmService
```
SRSAlgorithmService {
  - calculateNextReview(progress: UserProgress, response: ReviewResponse): SRSData
  - updateProgress(progress: UserProgress, event: ReviewEvent): UserProgress
  - isWordDueForReview(progress: UserProgress, date: Date): Boolean
}
```

### DailyListGenerationService
```
DailyListGenerationService {
  - generateDailyList(userId: UserId, config: DailyListConfig): DailyList
  - selectNewWords(userId: UserId, count: Integer): List<WordId>
  - selectReviewWords(userId: UserId, count: Integer): List<WordId>
}
```

### ProgressSynchronizationService
```
ProgressSynchronizationService {
  - synchronizeProgress(userId: UserId, localChanges: List<UserProgress>): SyncResult
  - resolveConflicts(serverData: UserProgress, localData: UserProgress): UserProgress
  - mergeProgressData(progressList: List<UserProgress>): List<UserProgress>
}
```

### ReviewAnalyticsService
```
ReviewAnalyticsService {
  - calculateAccuracyRate(userId: UserId, wordId: WordId): Float
  - getReviewStatistics(userId: UserId, period: TimePeriod): ReviewStats
  - identifyDifficultWords(userId: UserId): List<WordId>
}
```