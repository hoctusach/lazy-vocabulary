# Learning Progress Unit - Logical Design

## Architecture Overview
Event-driven microservice handling progress tracking, SRS scheduling, and real-time synchronization across devices.

## API Layer

### REST Endpoints
```
GET /api/progress/{userId}/daily-list
POST /api/progress/{userId}/review-events
GET /api/progress/{userId}/words/{wordId}
POST /api/progress/{userId}/sync
GET /api/progress/{userId}/statistics
```

### Request/Response Models
```python
# Daily list generation
GetDailyListRequest: userId, config?
GetDailyListResponse: newWords[], reviewWords[], generatedAt

# Review events
RecordReviewEventsRequest: events[]
RecordReviewEventsResponse: processedCount, errors[]

# Progress sync
SyncProgressRequest: localChanges[], lastSyncTimestamp
SyncProgressResponse: serverChanges[], conflicts[], syncTimestamp

# Statistics
GetStatisticsRequest: userId, period?
GetStatisticsResponse: totalWords, accuracy, streak, reviewsToday
```

## Application Services

### DailyListGenerationService
```python
class DailyListGenerationService:
    def generate_daily_list(self, request: GetDailyListRequest) -> GetDailyListResponse:
        # 1. Get user progress data
        # 2. Find words due for review
        # 3. Select new words based on algorithm
        # 4. Apply user preferences
        # 5. Publish DailyListGenerated event
        # 6. Return response
```

### ReviewEventProcessingService
```python
class ReviewEventProcessingService:
    def process_review_events(self, request: RecordReviewEventsRequest) -> RecordReviewEventsResponse:
        # 1. Validate events
        # 2. Create ReviewEvent entities
        # 3. Update UserProgress aggregates
        # 4. Recalculate SRS scheduling
        # 5. Publish ReviewEventRecorded events
        # 6. Return response
```

### ProgressSynchronizationService
```python
class ProgressSynchronizationService:
    def synchronize_progress(self, request: SyncProgressRequest) -> SyncProgressResponse:
        # 1. Detect conflicts with server data
        # 2. Apply conflict resolution strategy
        # 3. Merge progress data
        # 4. Update repositories
        # 5. Publish ProgressSynchronized event
        # 6. Return sync result
```

### ProgressAnalyticsService
```python
class ProgressAnalyticsService:
    def get_user_statistics(self, request: GetStatisticsRequest) -> GetStatisticsResponse:
        # 1. Query user progress data
        # 2. Calculate metrics
        # 3. Return statistics
```

## Event Handling

### Event Publishers
```python
class ProgressEventPublisher:
    def publish_review_event_recorded(self, event: ReviewEventRecorded) -> None
    def publish_progress_updated(self, event: ProgressUpdated) -> None
    def publish_daily_list_generated(self, event: DailyListGenerated) -> None
    def publish_progress_synchronized(self, event: ProgressSynchronized) -> None
```

### Event Subscribers
```python
class ProgressEventSubscriber:
    def handle_vocabulary_word_added(self, event: VocabularyWordAdded) -> None:
        # Initialize progress tracking for new word
        
    def handle_user_registered(self, event: UserRegistered) -> None:
        # Set up initial progress tracking
```

## Data Layer

### Repository Implementations
```python
class DynamoDBUserProgressRepository(UserProgressRepository):
    def find_by_user_and_word(self, userId: UserId, wordId: WordId) -> UserProgress:
        # Query with composite key
        
    def find_due_for_review(self, userId: UserId, date: Date) -> List[UserProgress]:
        # Query with GSI on nextReviewAt
        
    def save_all(self, progressList: List[UserProgress]) -> None:
        # Batch write with optimistic locking

class DynamoDBReviewEventRepository(ReviewEventRepository):
    def save_all(self, events: List[ReviewEvent]) -> None:
        # Batch write events (append-only)
        
    def find_by_user(self, userId: UserId, dateRange: DateRange) -> List[ReviewEvent]:
        # Query with time-based partitioning
```

### Data Models
```python
# DynamoDB UserProgress Table
{
    "PK": "USER#{userId}",
    "SK": "WORD#{wordId}",
    "progressId": "uuid",
    "srsInterval": "number",
    "easeFactor": "number",
    "repetitions": "number",
    "totalReviews": "number",
    "correctReviews": "number",
    "lastReviewedAt": "timestamp",
    "nextReviewAt": "timestamp",
    "updatedAt": "timestamp",
    "version": "number"
}

# DynamoDB ReviewEvents Table (time-series)
{
    "PK": "USER#{userId}",
    "SK": "EVENT#{timestamp}#{eventId}",
    "wordId": "uuid",
    "sessionId": "uuid",
    "response": {...},
    "responseTime": "number",
    "occurredAt": "timestamp"
}
```

## Integration Points

### Outbound Events
- **ReviewEventRecorded** → Analytics Unit (usage tracking)
- **ProgressUpdated** → Analytics Unit (performance metrics)

### Inbound Events
- **VocabularyWordAdded** → Initialize progress tracking
- **UserRegistered** → Set up user progress

### External Dependencies
- **DynamoDB** for progress and event storage
- **EventBridge** for event publishing/subscribing
- **Lambda** for async processing

## Scalability Patterns

### Event Sourcing
```python
class EventSourcedUserProgress:
    def rebuild_from_events(self, events: List[ReviewEvent]) -> UserProgress:
        # Reconstruct progress state from events
        # Enables audit trail and debugging
```

### CQRS (Command Query Responsibility Segregation)
```python
# Write model - optimized for updates
class ProgressCommandHandler:
    def handle_record_review_events(self, command: RecordReviewEventsCommand) -> None
        
# Read model - optimized for queries  
class ProgressQueryHandler:
    def handle_get_daily_list(self, query: GetDailyListQuery) -> DailyListView
```

### Async Processing
```python
# SQS-based event processing
def process_review_events_async(events: List[ReviewEvent]):
    # 1. Update progress in batches
    # 2. Recalculate SRS scheduling
    # 3. Update materialized views
    # 4. Send notifications if needed
```

### Real-time Sync
```python
# WebSocket for real-time updates
class ProgressWebSocketHandler:
    def handle_progress_update(self, userId: UserId, update: ProgressUpdate):
        # Broadcast to all user's connected devices
```

## File Structure
```
src/
├── api/
│   ├── progress_controller.py
│   ├── websocket_handler.py
│   └── models/
├── application/
│   ├── daily_list_generation_service.py
│   ├── review_event_processing_service.py
│   ├── progress_synchronization_service.py
│   └── progress_analytics_service.py
├── domain/
│   ├── entities/
│   ├── value_objects/
│   ├── events/
│   └── services/
├── infrastructure/
│   ├── repositories/
│   ├── event_handlers/
│   ├── websockets/
│   └── async_processors/
└── config/
```

## Deployment
- **AWS Lambda** for API endpoints
- **DynamoDB** for progress storage
- **SQS** for async event processing
- **API Gateway WebSocket** for real-time sync
- **EventBridge** for event orchestration
- **CloudWatch** for monitoring and alerting