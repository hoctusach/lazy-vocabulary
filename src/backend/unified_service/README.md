# Unified Lazy Vocabulary Backend Service

A consolidated Domain-Driven Design implementation that combines all functionality from the five original backend units into one cohesive service.

## Overview

This unified service consolidates the following original units:
- **User Management Unit**: Authentication, registration, session management
- **Vocabulary Service Unit**: Vocabulary CRUD, categories, search
- **Learning Progress Unit**: SRS algorithm, progress tracking, daily lists
- **Data Migration Unit**: Local data import, migration workflows
- **Analytics Unit**: Usage metrics, vocabulary analytics

## Architecture

### Domain Layer
- **Entities**: User, UserSession, VocabularyWord, Category, UserProgress, ReviewEvent, MigrationSession, UserActivityMetrics, VocabularyAnalytics
- **Value Objects**: UserId, Email, Nickname, WordText, Meaning, SRSData, etc.
- **Domain Events**: UserRegistered, VocabularyWordAdded, ReviewEventRecorded, etc.
- **Domain Services**: AuthenticationService, VocabularySearchService, SRSAlgorithmService, etc.
- **Repository Interfaces**: UserRepository, VocabularyRepository, etc.

### Application Layer
- **LazyVocabularyService**: Unified application service orchestrating all functionality
- **EventPublisher**: Domain event publishing mechanism

### Infrastructure Layer
- **In-Memory Repositories**: Complete implementations for all domain entities
- **Service Factory**: Dependency injection and initialization

### API Layer
- **LazyVocabularyController**: Unified REST API controller
- **APIResponse**: Standardized response helpers

## Features

### User Management
- ✅ User registration with email validation
- ✅ Authentication with session management
- ✅ Multi-device session support
- ✅ Session validation

### Vocabulary Management
- ✅ Category creation and management
- ✅ Vocabulary word CRUD operations
- ✅ Full-text search across words, meanings, examples
- ✅ Category-based word retrieval

### Learning Progress
- ✅ Spaced Repetition System (SRS) algorithm
- ✅ Review event recording
- ✅ Progress tracking per user/word
- ✅ Daily learning list generation

### Data Migration
- ✅ Local data import and merging
- ✅ Conflict resolution with timestamps
- ✅ Migration session tracking
- ✅ Idempotent migration process

### Analytics
- ✅ User activity metrics
- ✅ Vocabulary usage analytics
- ✅ Review accuracy tracking
- ✅ Aggregated privacy-compliant data

### Event-Driven Architecture
- ✅ Domain event publishing
- ✅ Event-driven integration points
- ✅ Comprehensive event logging

## Usage

### Basic Setup

```python
from service_factory import get_service_factory

# Initialize the service
factory = get_service_factory()
service = factory.get_service()
controller = factory.get_controller()
```

### User Management

```python
# Register user
result = service.register_user("user@example.com", "Username", "password")

# Login
session = service.login_user("user@example.com", "password", "web")

# Validate session
is_valid = service.validate_session(session_id)
```

### Vocabulary Management

```python
# Create category
category = service.create_category("Business English", "Business vocabulary")

# Add vocabulary word
word = service.add_vocabulary_word(
    "stakeholder", "person with interest in business", 
    category_id, "Consider all stakeholders", "parte interesada"
)

# Search vocabulary
results = service.search_vocabulary("business")
```

### Learning Progress

```python
# Get daily learning list
daily_words = service.get_daily_learning_list(user_id, 20)

# Record review event
result = service.record_review_event(user_id, word_id, True, 2500)
```

### Data Migration

```python
# Import local data
local_data = {"progress": {...}, "settings": {...}}
result = service.start_migration(user_id, local_data)
```

## API Endpoints

### User Management
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/validate/{session_id}` - Validate session

### Vocabulary Management
- `POST /api/vocabulary/categories` - Create category
- `GET /api/vocabulary/categories` - Get all categories
- `POST /api/vocabulary/words` - Add vocabulary word
- `GET /api/vocabulary/categories/{id}/words` - Get words by category
- `GET /api/vocabulary/search?q={query}` - Search vocabulary

### Learning Progress
- `POST /api/learning/review` - Record review event
- `GET /api/learning/daily-list/{user_id}` - Get daily learning list

### Data Migration
- `POST /api/migration/start` - Start data migration

### Analytics
- `GET /api/analytics/user-activity` - Get user activity metrics
- `GET /api/analytics/vocabulary` - Get vocabulary analytics

## Running the Demo

```bash
# From the unified_service directory
python demo.py
```

The demo showcases:
- User registration and authentication
- Vocabulary and category management
- Learning progress tracking
- Data migration workflow
- Analytics data collection
- Domain event publishing

## Sample Data

The service initializes with sample data including:
- 6 vocabulary categories (phrasal verbs, idioms, etc.)
- 11+ vocabulary words with examples and translations
- Complete category-word relationships

## Integration with Frontend

The unified service is designed to integrate with the existing React frontend:

1. **Replace local storage**: Frontend can call API endpoints instead of local storage
2. **Maintain compatibility**: API responses match existing frontend data structures
3. **Progressive migration**: Can be integrated incrementally without breaking changes
4. **Event-driven updates**: Domain events can trigger real-time UI updates

## Next Steps for Production

1. **Persistent Storage**: Replace in-memory repositories with PostgreSQL/DynamoDB
2. **Authentication**: Integrate with AWS Cognito or similar
3. **API Framework**: Add FastAPI/Flask for HTTP endpoints
4. **Caching**: Add Redis for performance optimization
5. **Event Streaming**: Use AWS EventBridge for event processing
6. **Monitoring**: Add CloudWatch/logging integration
7. **Security**: Add rate limiting, input validation, HTTPS
8. **Deployment**: Containerize and deploy to AWS Lambda/ECS

## File Structure

```
unified_service/
├── domain/
│   ├── entities.py          # All domain entities
│   ├── value_objects.py     # Value objects with validation
│   ├── events.py           # Domain events
│   ├── repositories.py     # Repository interfaces
│   └── services.py         # Domain services
├── application/
│   └── unified_service.py  # Main application service
├── infrastructure/
│   └── in_memory_repositories.py  # Repository implementations
├── api/
│   └── controllers.py      # REST API controllers
├── service_factory.py      # Dependency injection
├── demo.py                # Comprehensive demo
└── README.md              # This file
```

## Benefits of Unified Architecture

1. **Simplified Deployment**: Single service instead of five separate units
2. **Reduced Complexity**: Fewer inter-service communication points
3. **Better Performance**: No network overhead between units
4. **Easier Testing**: All functionality in one place
5. **Consistent Data Model**: Shared entities and value objects
6. **Event-Driven Integration**: Clean separation of concerns through events
7. **MVP-Appropriate**: Right-sized architecture for current needs

This unified service maintains all the benefits of Domain-Driven Design while providing a more practical architecture for the Lazy Vocabulary MVP.