a# Analytics Unit - Logical Design

## Architecture Overview
Event-driven analytics service processing usage data, generating reports, and maintaining privacy-compliant metrics.

## API Layer

### REST Endpoints
```
GET /api/analytics/users/activity
GET /api/analytics/vocabulary/popular
GET /api/analytics/vocabulary/difficult
GET /api/analytics/reports/{reportId}
POST /api/analytics/reports/generate
```

### Request/Response Models
```python
# User activity analytics
GetUserActivityRequest: period, granularity?
GetUserActivityResponse: dailyActive, weeklyActive, monthlyActive, trends[]

# Vocabulary analytics
GetPopularWordsRequest: categoryId?, limit?
GetPopularWordsResponse: words[], reviewCounts[], rankings[]

GetDifficultWordsRequest: threshold?, categoryId?
GetDifficultWordsResponse: words[], accuracyRates[], difficulties[]

# Report generation
GenerateReportRequest: reportType, period, parameters?
GenerateReportResponse: reportId, status, estimatedCompletion
```

## Application Services

### UserActivityAnalyticsService
```python
class UserActivityAnalyticsService:
    def get_user_activity_metrics(self, request: GetUserActivityRequest) -> GetUserActivityResponse:
        # 1. Query aggregated metrics
        # 2. Calculate trends
        # 3. Apply privacy filters
        # 4. Return response
        
    def process_user_activity_events(self, events: List[UserActivityRecorded]) -> None:
        # 1. Aggregate events by time period
        # 2. Update metrics tables
        # 3. Maintain rolling windows
```

### VocabularyAnalyticsService
```python
class VocabularyAnalyticsService:
    def get_popular_vocabulary(self, request: GetPopularWordsRequest) -> GetPopularWordsResponse:
        # 1. Query vocabulary analytics
        # 2. Rank by review frequency
        # 3. Apply filters
        # 4. Return results
        
    def get_difficult_vocabulary(self, request: GetDifficultWordsRequest) -> GetDifficultWordsResponse:
        # 1. Query accuracy metrics
        # 2. Calculate difficulty scores
        # 3. Filter by threshold
        # 4. Return results
```

### ReportGenerationService
```python
class ReportGenerationService:
    def generate_report(self, request: GenerateReportRequest) -> GenerateReportResponse:
        # 1. Validate report parameters
        # 2. Queue report generation job
        # 3. Return job status
        
    def process_report_generation(self, reportId: ReportId) -> None:
        # 1. Gather required data
        # 2. Generate charts and visualizations
        # 3. Create report document
        # 4. Store in S3
        # 5. Publish ReportGenerated event
```

### MetricsAggregationService
```python
class MetricsAggregationService:
    def aggregate_daily_metrics(self, date: Date) -> None:
        # 1. Process raw events from previous day
        # 2. Update user activity metrics
        # 3. Update vocabulary analytics
        # 4. Clean up old raw data
```

## Event Handling

### Event Publishers
```python
class AnalyticsEventPublisher:
    def publish_metrics_aggregated(self, event: MetricsAggregated) -> None
    def publish_report_generated(self, event: AnalyticsReportGenerated) -> None
```

### Event Subscribers
```python
class AnalyticsEventSubscriber:
    def handle_review_event_recorded(self, event: ReviewEventRecorded) -> None:
        # Update vocabulary analytics
        
    def handle_user_logged_in(self, event: UserLoggedIn) -> None:
        # Track user activity
        
    def handle_progress_updated(self, event: ProgressUpdated) -> None:
        # Update learning analytics
```

## Data Layer

### Repository Implementations
```python
class DynamoDBUserActivityMetricsRepository(UserActivityMetricsRepository):
    def find_by_period(self, period: TimePeriod) -> UserActivityMetrics:
        # Query with time-based partitioning
        
    def save(self, metrics: UserActivityMetrics) -> None:
        # Upsert with atomic counters

class DynamoDBVocabularyAnalyticsRepository(VocabularyAnalyticsRepository):
    def find_most_reviewed(self, limit: Integer) -> List[VocabularyAnalytics]:
        # Query with GSI on review count
        
    def find_least_accurate(self, limit: Integer) -> List[VocabularyAnalytics]:
        # Query with GSI on accuracy rate
```

### Data Models
```python
# DynamoDB UserActivityMetrics Table
{
    "PK": "METRICS#{period}",
    "SK": "ACTIVITY#{date}",
    "dailyActiveUsers": "number",
    "weeklyActiveUsers": "number", 
    "monthlyActiveUsers": "number",
    "newUsers": "number",
    "returningUsers": "number",
    "totalSessions": "number",
    "avgSessionDuration": "number",
    "generatedAt": "timestamp"
}

# DynamoDB VocabularyAnalytics Table
{
    "PK": "WORD#{wordId}",
    "SK": "ANALYTICS",
    "categoryId": "uuid",
    "totalReviews": "number",
    "uniqueUsers": "number",
    "correctReviews": "number",
    "accuracyRate": "number",
    "avgResponseTime": "number",
    "popularityScore": "number",
    "lastUpdatedAt": "timestamp"
}
```

## Integration Points

### Outbound Events
- **MetricsAggregated** → External systems (notifications)
- **AnalyticsReportGenerated** → Admin notifications

### Inbound Events
- **ReviewEventRecorded** → Update vocabulary analytics
- **UserLoggedIn** → Track user activity
- **ProgressUpdated** → Update learning metrics

### External Dependencies
- **DynamoDB** for metrics storage
- **S3** for report storage
- **Google Analytics** for external tracking
- **EventBridge** for event processing

## Scalability Patterns

### Stream Processing
```python
# Kinesis Data Streams for real-time analytics
class AnalyticsStreamProcessor:
    def process_review_events(self, events: List[ReviewEvent]) -> None:
        # 1. Real-time aggregation
        # 2. Update metrics incrementally
        # 3. Trigger alerts if needed
```

### Data Lake Architecture
```python
# S3 + Athena for historical analytics
class DataLakeAnalytics:
    def export_to_data_lake(self, date: Date) -> None:
        # 1. Export daily metrics to S3
        # 2. Partition by date/category
        # 3. Enable Athena queries
```

### Async Aggregation
```python
# SQS-based batch processing
def process_analytics_batch(events: List[AnalyticsEvent]):
    # 1. Group events by type
    # 2. Update metrics in batches
    # 3. Maintain data consistency
```

### Caching Strategy
```python
class CachedAnalyticsService:
    def get_popular_words(self, request: GetPopularWordsRequest) -> GetPopularWordsResponse:
        # 1. Check Redis cache
        # 2. Fallback to database
        # 3. Cache with appropriate TTL
```

## File Structure
```
src/
├── api/
│   ├── analytics_controller.py
│   ├── reports_controller.py
│   └── models/
├── application/
│   ├── user_activity_analytics_service.py
│   ├── vocabulary_analytics_service.py
│   ├── report_generation_service.py
│   └── metrics_aggregation_service.py
├── domain/
│   ├── entities/
│   ├── value_objects/
│   ├── events/
│   └── services/
├── infrastructure/
│   ├── repositories/
│   ├── event_handlers/
│   ├── stream_processors/
│   └── external/
└── config/
```

## Deployment
- **AWS Lambda** for API endpoints and event processing
- **DynamoDB** for metrics storage
- **Kinesis Data Streams** for real-time processing
- **S3** for report storage and data lake
- **Athena** for ad-hoc analytics queries
- **EventBridge** for event orchestration
- **CloudWatch** for monitoring and dashboards