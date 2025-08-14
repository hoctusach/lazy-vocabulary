# Vocabulary Service Unit

A Domain-Driven Design implementation of vocabulary management functionality for the Lazy Vocabulary application.

## Overview

This service unit manages vocabulary content, categories, search functionality, and content administration using event-driven architecture and DDD principles.

## Architecture

### Domain Layer
- **Entities**: VocabularyWord, Category
- **Value Objects**: WordId, WordText, Meaning, CategoryId, CategoryName
- **Domain Events**: VocabularyWordAdded, CategoryCreated
- **Domain Services**: VocabularySearchService
- **Repository Interfaces**: VocabularyRepository, CategoryRepository

### Application Layer
- **Application Services**: VocabularyQueryService, ContentAdministrationService
- **Event Publisher**: EventPublisher (in-memory implementation)

### Infrastructure Layer
- **Repository Implementations**: InMemoryVocabularyRepository, InMemoryCategoryRepository
- **Event Store**: In-memory event storage via EventPublisher

### API Layer
- **Controllers**: VocabularyController
- **Service Factory**: VocabularyServiceFactory for dependency injection

## Features

- **Category Management**: Create and manage vocabulary categories
- **Vocabulary Management**: Add, retrieve, and search vocabulary words
- **Search Functionality**: Full-text search across words, meanings, examples, and translations
- **Event-Driven**: Publishes domain events for integration with other units
- **Spaced Repetition Support**: Retrieve words by category for learning algorithms

## Usage

### Basic Setup

```python
from backend.vocabulary_service_unit.service_factory import VocabularyServiceFactory

# Initialize the service
factory = VocabularyServiceFactory()
controller = factory.get_controller()
```

### Create Categories

```python
response = controller.create_category("Basic Words", "Fundamental vocabulary")
if response["success"]:
    category_id = response["data"]["category_id"]
```

### Add Vocabulary Words

```python
response = controller.add_word(
    word_text="hello",
    meaning="a greeting",
    category_id=category_id,
    example="Hello, how are you?",
    translation="hola"
)
```

### Query Vocabulary

```python
# Get all categories
categories = controller.get_categories()

# Get words by category
words = controller.get_words_by_category(category_id)

# Search vocabulary
results = controller.search_vocabulary("hello")
```

## Integration with Current Application

The vocabulary service integrates with the existing Lazy Vocabulary application by:

1. **Providing vocabulary data** for the spaced repetition algorithm
2. **Supporting search functionality** for vocabulary lookup
3. **Managing categories** for organizing learning content
4. **Publishing events** for analytics and UI updates
5. **Enabling content administration** for adding new vocabulary

## Running Demos

### Basic Functionality Demo
```bash
python src/backend/vocabulary_service_unit/demo.py
```

### Integration Demo
```bash
python src/backend/vocabulary_service_unit/integration_demo.py
```

## File Structure

```
vocabulary_service_unit/
├── domain/
│   ├── entities/
│   │   ├── vocabulary_word.py
│   │   └── category.py
│   ├── value_objects/
│   │   ├── word_id.py
│   │   ├── word_text.py
│   │   ├── meaning.py
│   │   ├── category_id.py
│   │   └── category_name.py
│   ├── events/
│   │   ├── vocabulary_word_added.py
│   │   └── category_created.py
│   ├── services/
│   │   └── vocabulary_search_service.py
│   └── repositories/
│       ├── vocabulary_repository.py
│       └── category_repository.py
├── application/
│   ├── vocabulary_query_service.py
│   ├── content_administration_service.py
│   └── event_publisher.py
├── infrastructure/
│   ├── in_memory_vocabulary_repository.py
│   └── in_memory_category_repository.py
├── api/
│   └── vocabulary_controller.py
├── service_factory.py
├── demo.py
├── integration_demo.py
└── README.md
```

## Future Enhancements

- Replace in-memory storage with PostgreSQL
- Add audio asset management
- Implement caching with Redis
- Add Elasticsearch for advanced search
- Create REST API endpoints
- Add authentication and authorization
- Implement event streaming with EventBridge