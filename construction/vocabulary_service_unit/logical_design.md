# Vocabulary Service Unit - Logical Design

## Architecture Overview
Event-driven microservice managing vocabulary content, search functionality, and content administration.

## API Layer

### REST Endpoints
```
GET /api/vocabulary/categories
GET /api/vocabulary/categories/{categoryId}/words
GET /api/vocabulary/search
POST /api/admin/vocabulary/upload
POST /api/admin/audio/upload
GET /api/vocabulary/words/{wordId}
```

### Request/Response Models
```python
# Vocabulary retrieval
GetWordsRequest: categoryId, page, size
GetWordsResponse: words[], totalCount, hasMore

# Search
SearchRequest: query, categoryFilter?, page, size  
SearchResponse: words[], totalCount, relevanceScores

# Admin upload
UploadVocabularyRequest: vocabularyData[], categoryId
UploadVocabularyResponse: uploadedCount, errors[]

UploadAudioRequest: wordId, audioFile
UploadAudioResponse: audioAsset, cdnUrl
```

## Application Services

### VocabularyQueryService
```python
class VocabularyQueryService:
    def get_words_by_category(self, request: GetWordsRequest) -> GetWordsResponse:
        # 1. Validate category exists
        # 2. Query vocabulary repository
        # 3. Apply pagination
        # 4. Return response
        
    def search_vocabulary(self, request: SearchRequest) -> SearchResponse:
        # 1. Validate search query
        # 2. Execute search with ranking
        # 3. Apply filters and pagination
        # 4. Return results
```

### ContentAdministrationService
```python
class ContentAdministrationService:
    def upload_vocabulary(self, request: UploadVocabularyRequest) -> UploadVocabularyResponse:
        # 1. Validate vocabulary data format
        # 2. Create VocabularyWord aggregates
        # 3. Save to repository
        # 4. Publish VocabularyWordAdded events
        # 5. Update category word counts
        
    def upload_audio(self, request: UploadAudioRequest) -> UploadAudioResponse:
        # 1. Validate audio file
        # 2. Upload to S3
        # 3. Create AudioAsset
        # 4. Update vocabulary word
        # 5. Publish AudioAssetUploaded event
```

### CategoryManagementService
```python
class CategoryManagementService:
    def create_category(self, name: CategoryName) -> Category:
        # 1. Validate uniqueness
        # 2. Create Category aggregate
        # 3. Publish CategoryCreated event
        
    def update_word_count(self, categoryId: CategoryId, delta: int) -> None:
        # 1. Update category word count
        # 2. Ensure consistency
```

## Event Handling

### Event Publishers
```python
class VocabularyEventPublisher:
    def publish_vocabulary_word_added(self, event: VocabularyWordAdded) -> None
    def publish_vocabulary_word_updated(self, event: VocabularyWordUpdated) -> None
    def publish_audio_asset_uploaded(self, event: AudioAssetUploaded) -> None
    def publish_category_created(self, event: CategoryCreated) -> None
```

### Event Subscribers
```python
# No inbound events for core functionality
# May subscribe to user events for access control
```

## Data Layer

### Repository Implementations
```python
class PostgreSQLVocabularyRepository(VocabularyRepository):
    def find_by_category(self, categoryId: CategoryId, page: Page) -> List[VocabularyWord]:
        # Query with pagination and indexing
        
    def search(self, query: SearchQuery, page: Page) -> List[VocabularyWord]:
        # Full-text search with ranking
        
class PostgreSQLCategoryRepository(CategoryRepository):
    def find_by_name(self, name: CategoryName) -> Category:
        # Query with unique constraint
```

### Data Models
```sql
-- Vocabulary table
CREATE TABLE vocabulary_words (
    word_id UUID PRIMARY KEY,
    word_text VARCHAR(200) NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT,
    translation TEXT,
    category_id UUID NOT NULL,
    audio_s3_key VARCHAR(500),
    audio_cdn_url VARCHAR(500),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Categories table  
CREATE TABLE categories (
    category_id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMP
);

-- Search indexes
CREATE INDEX idx_vocabulary_search ON vocabulary_words 
USING gin(to_tsvector('english', word_text || ' ' || meaning || ' ' || example));
```

## Integration Points

### Outbound Events
- **VocabularyWordAdded** → Learning Progress Unit (new word available)
- **AudioAssetUploaded** → Analytics Unit (content tracking)

### External Dependencies
- **Aurora PostgreSQL** for vocabulary storage
- **S3** for audio file storage
- **CloudFront** for CDN delivery
- **EventBridge** for event publishing

## Scalability Patterns

### Caching Strategy
```python
class CachedVocabularyRepository:
    def find_by_category(self, categoryId: CategoryId, page: Page) -> List[VocabularyWord]:
        # 1. Check Redis cache
        # 2. Fallback to database
        # 3. Cache results with TTL
```

### Search Optimization
```python
class ElasticsearchVocabularyRepository:
    def search(self, query: SearchQuery, page: Page) -> List[VocabularyWord]:
        # 1. Execute Elasticsearch query
        # 2. Apply relevance scoring
        # 3. Return ranked results
```

### Async Processing
```python
# Audio processing pipeline
def process_audio_upload(event: AudioAssetUploaded):
    # 1. Generate multiple formats
    # 2. Create thumbnails/waveforms
    # 3. Update CDN distribution
```

## File Structure
```
src/
├── api/
│   ├── vocabulary_controller.py
│   ├── admin_controller.py
│   └── models/
├── application/
│   ├── vocabulary_query_service.py
│   ├── content_administration_service.py
│   └── category_management_service.py
├── domain/
│   ├── entities/
│   ├── value_objects/
│   ├── events/
│   └── services/
├── infrastructure/
│   ├── repositories/
│   ├── search/
│   ├── storage/
│   └── event_publishers/
└── config/
```

## Deployment
- **AWS Lambda** for API endpoints
- **Aurora Serverless PostgreSQL** for data storage
- **S3** for audio storage
- **CloudFront** for CDN
- **ElastiCache Redis** for caching
- **EventBridge** for events