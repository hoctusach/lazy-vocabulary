# Data Migration Unit

A Domain-Driven Design implementation of data migration services for seamlessly transferring local vocabulary progress to cloud storage.

## Architecture

### Domain Layer
- **Entities**: MigrationSession, LocalDataSnapshot
- **Value Objects**: MigrationSessionId, MigrationStatus, LocalProgressData, MigrationResult
- **Domain Events**: MigrationStarted, LocalDataDetected, MigrationCompleted
- **Domain Services**: LocalDataDetectionService, MigrationOrchestrationService
- **Repository Interfaces**: MigrationSessionRepository, LocalDataSnapshotRepository

### Application Layer
- **MigrationFacade**: Main application service orchestrating migration operations
- **EventPublisher**: Publishes domain events

### Infrastructure Layer
- **InMemoryMigrationSessionRepository**: In-memory implementation of MigrationSessionRepository
- **InMemoryLocalDataSnapshotRepository**: In-memory implementation of LocalDataSnapshotRepository

### API Layer
- **MigrationController**: REST API controller for migration endpoints
- **Models**: Request/response data models

## Usage

### Running the Demo
```bash
# From the project root
python -m src.backend.data_migration_unit.complete_demo
```

### Integration Example
```python
from src.backend.data_migration_unit.infrastructure.in_memory_migration_session_repository import InMemoryMigrationSessionRepository
from src.backend.data_migration_unit.domain.services.local_data_detection_service import LocalDataDetectionService
from src.backend.data_migration_unit.domain.services.migration_orchestration_service import MigrationOrchestrationService
from src.backend.data_migration_unit.application.event_publisher import EventPublisher
from src.backend.data_migration_unit.application.migration_facade import MigrationFacade

# Setup
session_repo = InMemoryMigrationSessionRepository()
detection_service = LocalDataDetectionService()
orchestration_service = MigrationOrchestrationService(session_repo)
event_publisher = EventPublisher()

facade = MigrationFacade(detection_service, orchestration_service, event_publisher)

# Detect local data
local_data = {
    "progress": [
        {
            "word_id": "hello",
            "review_count": 5,
            "correct_count": 4,
            "last_reviewed_at": "2024-01-01T10:00:00",
            "srs_interval": 3,
            "ease_factor": 2.5
        }
    ]
}

detection_result = facade.detect_local_data("user123", local_data)

# Start migration
migration_result = facade.start_migration("user123", local_data)

# Check status
status = facade.get_migration_status("user123")
```

## API Endpoints

### Detect Migration
```python
POST /api/migration/detect
{
    "user_id": "string",
    "local_data": {
        "progress": [...]
    }
}
```

### Start Migration
```python
POST /api/migration/start
{
    "user_id": "string", 
    "local_data": {
        "progress": [...]
    }
}
```

### Get Migration Status
```python
GET /api/migration/status
{
    "user_id": "string"
}
```

## Features

- Local data detection and validation
- Automated migration processing
- Session management with progress tracking
- Event-driven architecture with domain events
- Data validation and error handling
- In-memory storage for demo purposes
- RESTful API layer
- Comprehensive error handling
- Domain-driven design principles

## Data Validation

The system validates local progress data ensuring:
- Review counts are non-negative
- Correct counts don't exceed review counts
- SRS intervals are positive
- Ease factors are greater than zero
- Timestamps are valid

## Event Flow

1. **LocalDataDetected** - When local data is found
2. **MigrationStarted** - When migration begins
3. **MigrationCompleted** - When migration finishes successfully

## Next Steps for Production

1. Replace in-memory repositories with persistent storage (DynamoDB, S3)
2. Implement batch processing for large datasets
3. Add conflict resolution for existing server data
4. Implement retry mechanisms for failed migrations
5. Add comprehensive logging and monitoring
6. Implement data backup before migration
7. Add migration rollback capabilities
8. Connect to external event systems (EventBridge)
9. Add rate limiting and throttling
10. Implement data encryption for sensitive information