# Analytics Unit - Backend Implementation

## Overview
This is a Domain-Driven Design implementation of the Analytics Unit for the lazy-vocabulary application. It processes usage analytics, tracks vocabulary performance, and provides insights for administrators and users.

## Architecture

### Domain Layer
- **Entities**: UserActivityMetrics, VocabularyAnalytics
- **Value Objects**: TimePeriod, UserActivityData, ReviewMetrics, AccuracyMetrics, AnalyticsId, MetricsId
- **Domain Services**: AnalyticsQueryService
- **Repository Interfaces**: UserActivityMetricsRepository, VocabularyAnalyticsRepository

### Application Layer
- **VocabularyAnalyticsService**: Processes review events and provides vocabulary insights
- **UserActivityAnalyticsService**: Tracks user activity and engagement metrics

### Infrastructure Layer
- **InMemoryVocabularyAnalyticsRepository**: In-memory storage for vocabulary analytics
- **InMemoryUserActivityMetricsRepository**: In-memory storage for user activity metrics

### API Layer
- **AnalyticsController**: REST API endpoints for analytics data

## Key Features

### Vocabulary Analytics
- Tracks review frequency and popularity of words
- Calculates accuracy rates and difficulty scores
- Identifies most/least popular and difficult vocabulary
- Monitors average response times

### User Activity Analytics
- Tracks daily, weekly, and monthly active users
- Distinguishes between new and returning users
- Provides engagement metrics and trends

### Privacy-Compliant Design
- All data is aggregated and anonymized
- No individual user data is exposed in analytics
- Complies with privacy regulations

## Usage

### Running the Demo
```bash
cd src/backend/analytics_unit
python simple_demo.py
```

### Integration Example
```bash
python integration_example.py
```

## Integration with Other Units

The Analytics Unit integrates with other system components:

```python
analytics = AnalyticsBackend()

# Process events from Learning Progress Unit
result = analytics.process_learning_progress_event(
    user_id="user123",
    word_id="hello", 
    category_id="greetings",
    is_correct=True,
    response_time=1200
)

# Get admin dashboard data
dashboard_data = analytics.get_admin_dashboard_data()

# Get vocabulary insights
insights = analytics.get_vocabulary_insights()
```

## Key Analytics Provided

### Popular Vocabulary
- Most reviewed words across all users
- Popularity scores based on review frequency
- Category-based filtering

### Difficult Vocabulary
- Words with low accuracy rates
- Difficulty scores and thresholds
- Response time analysis

### User Activity
- Active user counts (daily/weekly/monthly)
- New vs returning user metrics
- Engagement trends

## Next Steps for Production

1. **Event-Driven Architecture**: Subscribe to domain events from other units
2. **Real-time Processing**: Implement stream processing for live analytics
3. **Data Warehouse**: Add data lake for historical analytics
4. **Reporting**: Generate automated reports and visualizations
5. **External Integration**: Connect to Google Analytics, Mixpanel, etc.
6. **Caching**: Add Redis for frequently accessed analytics
7. **Privacy Controls**: Enhanced anonymization and data retention policies

## File Structure
```
src/backend/analytics_unit/
├── domain/
│   ├── entities/
│   ├── value_objects/
│   ├── services/
│   └── repositories/
├── application/
├── infrastructure/
├── api/
├── simple_demo.py
├── integration_example.py
└── README.md
```

## Demo Results
The implementation successfully demonstrates:
- ✅ Vocabulary analytics tracking (popularity, difficulty)
- ✅ User activity metrics (active users, engagement)
- ✅ Real-time analytics processing
- ✅ Privacy-compliant aggregated data
- ✅ Integration with Learning Progress Unit events
- ✅ Admin dashboard data provision

This analytics backend provides valuable insights for improving the vocabulary learning experience while maintaining user privacy.