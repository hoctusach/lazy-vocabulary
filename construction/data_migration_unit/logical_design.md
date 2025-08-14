# Data Migration Unit - Logical Design

## Architecture Overview
One-time migration service handling local data detection, conflict resolution, and seamless cloud transition.

## API Layer

### REST Endpoints
```
GET /api/migration/{userId}/detect
POST /api/migration/{userId}/start
GET /api/migration/{userId}/status
POST /api/migration/{userId}/resolve-conflicts
GET /api/migration/{userId}/summary
```

### Request/Response Models
```python
# Migration detection
DetectMigrationRequest: userId
DetectMigrationResponse: hasLocalData, itemCount, dataVersion, canMigrate

# Migration start
StartMigrationRequest: userId, config?, localData
StartMigrationResponse: sessionId, status, estimatedDuration

# Migration status
GetMigrationStatusRequest: userId
GetMigrationStatusResponse: sessionId, status, progress, currentStep, errors[]

# Conflict resolution
ResolveConflictsRequest: sessionId, resolutions[]
ResolveConflictsResponse: resolvedCount, remainingConflicts

# Migration summary
GetMigrationSummaryRequest: userId
GetMigrationSummaryResponse: result, summary, recommendations[]
```

## Application Services

### MigrationDetectionService
```python
class MigrationDetectionService:
    def detect_local_data(self, request: DetectMigrationRequest) -> DetectMigrationResponse:
        # 1. Check for local storage indicators
        # 2. Validate data format compatibility
        # 3. Estimate migration complexity
        # 4. Return detection result
```

### MigrationOrchestrationService
```python
class MigrationOrchestrationService:
    def start_migration(self, request: StartMigrationRequest) -> StartMigrationResponse:
        # 1. Create MigrationSession
        # 2. Validate local data
        # 3. Create data snapshot
        # 4. Queue migration job
        # 5. Publish MigrationStarted event
        # 6. Return session info
        
    def process_migration_batch(self, sessionId: MigrationSessionId, batch: List[LocalProgressData]) -> BatchResult:
        # 1. Transform local data format
        # 2. Detect conflicts with server data
        # 3. Apply resolution strategies
        # 4. Update progress repositories
        # 5. Update migration status
```

### ConflictResolutionService
```python
class ConflictResolutionService:
    def detect_conflicts(self, localData: LocalProgressData, serverData: UserProgress) -> List[DataConflict]:
        # 1. Compare timestamps
        # 2. Check data consistency
        # 3. Identify resolution strategies
        # 4. Create conflict records
        
    def resolve_conflicts(self, request: ResolveConflictsRequest) -> ResolveConflictsResponse:
        # 1. Apply user-selected resolutions
        # 2. Merge conflicting data
        # 3. Update repositories
        # 4. Mark conflicts as resolved
```

### MigrationStatusService
```python
class MigrationStatusService:
    def get_migration_status(self, request: GetMigrationStatusRequest) -> GetMigrationStatusResponse:
        # 1. Query migration session
        # 2. Calculate progress percentage
        # 3. Return current status
        
    def get_migration_summary(self, request: GetMigrationSummaryRequest) -> GetMigrationSummaryResponse:
        # 1. Generate migration report
        # 2. Provide recommendations
        # 3. Return summary
```

## Event Handling

### Event Publishers
```python
class MigrationEventPublisher:
    def publish_migration_started(self, event: MigrationStarted) -> None
    def publish_local_data_detected(self, event: LocalDataDetected) -> None
    def publish_data_conflict_detected(self, event: DataConflictDetected) -> None
    def publish_migration_completed(self, event: MigrationCompleted) -> None
    def publish_migration_failed(self, event: MigrationFailed) -> None
```

### Event Subscribers
```python
class MigrationEventSubscriber:
    def handle_user_registered(self, event: UserRegistered) -> None:
        # Check for existing local data to migrate
```

## Data Layer

### Repository Implementations
```python
class DynamoDBMigrationSessionRepository(MigrationSessionRepository):
    def save(self, session: MigrationSession) -> None:
        # Store with optimistic locking
        
    def find_active_session(self, userId: UserId) -> MigrationSession:
        # Query active migration sessions

class S3LocalDataSnapshotRepository(LocalDataSnapshotRepository):
    def save(self, snapshot: LocalDataSnapshot) -> None:
        # Store snapshot in S3 with encryption
        
    def find_by_user(self, userId: UserId) -> LocalDataSnapshot:
        # Retrieve from S3
```

### Data Models
```python
# DynamoDB MigrationSession Table
{
    "PK": "USER#{userId}",
    "SK": "MIGRATION#{sessionId}",
    "status": "string",
    "progress": "number",
    "currentStep": "string",
    "totalItems": "number",
    "migratedItems": "number",
    "conflictCount": "number",
    "startedAt": "timestamp",
    "completedAt": "timestamp",
    "errors": ["string"],
    "ttl": "timestamp"
}

# S3 LocalDataSnapshot
{
    "snapshotId": "uuid",
    "userId": "uuid",
    "progressData": [...],
    "userPreferences": {...},
    "createdAt": "timestamp",
    "dataVersion": "string",
    "checksum": "string"
}
```

## Integration Points

### Outbound Events
- **MigrationCompleted** → Learning Progress Unit (data available)
- **LocalDataDetected** → Analytics Unit (migration tracking)

### Inbound Events
- **UserRegistered** → Check for migration opportunities

### External Dependencies
- **DynamoDB** for session tracking
- **S3** for data snapshots
- **SQS** for async processing
- **EventBridge** for event publishing

## Scalability Patterns

### Async Processing
```python
# SQS-based migration processing
def process_migration_job(sessionId: MigrationSessionId):
    # 1. Process data in batches
    # 2. Handle failures gracefully
    # 3. Update progress incrementally
    # 4. Notify on completion
```

### Batch Processing
```python
class BatchMigrationProcessor:
    def process_batch(self, batch: List[LocalProgressData]) -> BatchResult:
        # 1. Transform data format
        # 2. Validate consistency
        # 3. Apply conflict resolution
        # 4. Update repositories atomically
```

### Error Handling
```python
class MigrationErrorHandler:
    def handle_migration_error(self, sessionId: MigrationSessionId, error: Exception) -> None:
        # 1. Log error details
        # 2. Update session status
        # 3. Determine retry strategy
        # 4. Notify user if needed
```

### Data Validation
```python
class MigrationDataValidator:
    def validate_local_data(self, data: LocalDataSnapshot) -> ValidationResult:
        # 1. Check data format
        # 2. Validate integrity
        # 3. Ensure compatibility
        # 4. Return validation result
```

## File Structure
```
src/
├── api/
│   ├── migration_controller.py
│   └── models/
├── application/
│   ├── migration_detection_service.py
│   ├── migration_orchestration_service.py
│   ├── conflict_resolution_service.py
│   └── migration_status_service.py
├── domain/
│   ├── entities/
│   ├── value_objects/
│   ├── events/
│   └── services/
├── infrastructure/
│   ├── repositories/
│   ├── processors/
│   ├── validators/
│   └── event_handlers/
└── config/
```

## Deployment
- **AWS Lambda** for API endpoints and processing
- **DynamoDB** for session tracking
- **S3** for data snapshots
- **SQS** for async job processing
- **EventBridge** for event orchestration
- **CloudWatch** for monitoring and alerts

## Migration Workflow
1. **Detection Phase**: Check for local data
2. **Preparation Phase**: Create snapshot and validate
3. **Processing Phase**: Transform and migrate data in batches
4. **Conflict Resolution Phase**: Handle data conflicts
5. **Completion Phase**: Finalize migration and cleanup
6. **Verification Phase**: Validate migrated data integrity