# Analytics Unit - Domain Model

## Domain Overview
Processes usage analytics, generates administrative reports, and maintains privacy-compliant aggregated metrics.

## Aggregates

### UserActivityMetrics Aggregate
**Root Entity**: UserActivityMetrics
**Consistency Boundary**: Aggregated user activity data for a time period
**Invariants**:
- Metrics are aggregated and anonymized
- Time periods cannot overlap for same metric type
- All counts must be non-negative

### VocabularyAnalytics Aggregate
**Root Entity**: VocabularyAnalytics
**Consistency Boundary**: Analytics data for individual vocabulary words
**Invariants**:
- Analytics data is aggregated across all users
- Accuracy rates are between 0.0 and 1.0
- Review counts must be non-negative

## Entities

### UserActivityMetrics (Aggregate Root)
```
UserActivityMetrics {
  - metricsId: MetricsId (Identity)
  - period: TimePeriod (Value Object)
  - activeUsers: UserActivityData (Value Object)
  - sessionMetrics: SessionMetrics (Value Object)
  - generatedAt: DateTime
  - lastUpdatedAt: DateTime
}
```

### VocabularyAnalytics (Aggregate Root)
```
VocabularyAnalytics {
  - analyticsId: AnalyticsId (Identity)
  - wordId: WordId
  - categoryId: CategoryId
  - reviewMetrics: ReviewMetrics (Value Object)
  - accuracyMetrics: AccuracyMetrics (Value Object)
  - popularityScore: Float
  - lastUpdatedAt: DateTime
}
```

### AnalyticsReport (Entity)
```
AnalyticsReport {
  - reportId: ReportId (Identity)
  - reportType: ReportType (enum)
  - period: TimePeriod (Value Object)
  - data: ReportData (Value Object)
  - generatedAt: DateTime
  - generatedBy: UserId
}
```

## Value Objects

### TimePeriod
```
TimePeriod {
  - startDate: Date
  - endDate: Date
  - periodType: PeriodType (enum: DAILY, WEEKLY, MONTHLY)
  - validate(): Boolean
  - contains(date: Date): Boolean
}
```

### UserActivityData
```
UserActivityData {
  - dailyActiveUsers: Integer
  - weeklyActiveUsers: Integer
  - monthlyActiveUsers: Integer
  - newUsers: Integer
  - returningUsers: Integer
}
```

### SessionMetrics
```
SessionMetrics {
  - totalSessions: Integer
  - averageSessionDuration: Duration
  - averageWordsPerSession: Float
  - sessionCompletionRate: Float
}
```

### ReviewMetrics
```
ReviewMetrics {
  - totalReviews: Integer
  - uniqueUsers: Integer
  - averageResponseTime: Duration
  - reviewFrequency: Float
}
```

### AccuracyMetrics
```
AccuracyMetrics {
  - correctReviews: Integer
  - totalReviews: Integer
  - accuracyRate: Float
  - difficultyScore: Float
  - calculateAccuracyRate(): Float
}
```

### ReportData
```
ReportData {
  - metrics: Map<String, Object>
  - charts: List<ChartData>
  - summary: String
}
```

### ChartData
```
ChartData {
  - chartType: ChartType (enum)
  - title: String
  - data: List<DataPoint>
}
```

## Domain Events

### UserActivityRecorded
```
UserActivityRecorded {
  - userId: UserId
  - activityType: ActivityType (enum)
  - sessionId: SessionId
  - occurredAt: DateTime
}
```

### ReviewAnalyticsUpdated
```
ReviewAnalyticsUpdated {
  - wordId: WordId
  - previousMetrics: ReviewMetrics
  - newMetrics: ReviewMetrics
  - occurredAt: DateTime
}
```

### AnalyticsReportGenerated
```
AnalyticsReportGenerated {
  - reportId: ReportId
  - reportType: ReportType
  - period: TimePeriod
  - generatedAt: DateTime
}
```

### MetricsAggregated
```
MetricsAggregated {
  - period: TimePeriod
  - metricsType: MetricsType (enum)
  - recordCount: Integer
  - aggregatedAt: DateTime
}
```

## Policies

### PrivacyCompliancePolicy
Ensures all analytics data is aggregated and anonymized

### DataRetentionPolicy
Manages retention periods for different types of analytics data

### ReportGenerationPolicy
Defines rules for automated report generation and scheduling

## Repositories

### UserActivityMetricsRepository
```
UserActivityMetricsRepository {
  - findByPeriod(period: TimePeriod): UserActivityMetrics
  - findByDateRange(startDate: Date, endDate: Date): List<UserActivityMetrics>
  - save(metrics: UserActivityMetrics): void
  - deleteOlderThan(date: Date): void
}
```

### VocabularyAnalyticsRepository
```
VocabularyAnalyticsRepository {
  - findByWordId(wordId: WordId): VocabularyAnalytics
  - findByCategory(categoryId: CategoryId): List<VocabularyAnalytics>
  - findMostReviewed(limit: Integer): List<VocabularyAnalytics>
  - findLeastAccurate(limit: Integer): List<VocabularyAnalytics>
  - save(analytics: VocabularyAnalytics): void
}
```

### AnalyticsReportRepository
```
AnalyticsReportRepository {
  - findById(reportId: ReportId): AnalyticsReport
  - findByType(reportType: ReportType): List<AnalyticsReport>
  - findByPeriod(period: TimePeriod): List<AnalyticsReport>
  - save(report: AnalyticsReport): void
}
```

## Domain Services

### MetricsAggregationService
```
MetricsAggregationService {
  - aggregateUserActivity(period: TimePeriod): UserActivityMetrics
  - aggregateVocabularyMetrics(wordId: WordId): VocabularyAnalytics
  - processRawEvents(events: List<ReviewEvent>): List<VocabularyAnalytics>
}
```

### ReportGenerationService
```
ReportGenerationService {
  - generateUserActivityReport(period: TimePeriod): AnalyticsReport
  - generateVocabularyReport(categoryId: CategoryId): AnalyticsReport
  - generatePerformanceReport(period: TimePeriod): AnalyticsReport
  - scheduleAutomaticReports(): void
}
```

### AnalyticsQueryService
```
AnalyticsQueryService {
  - getActiveUserTrends(period: TimePeriod): List<DataPoint>
  - getMostPopularWords(limit: Integer): List<VocabularyAnalytics>
  - getDifficultWords(threshold: Float): List<VocabularyAnalytics>
  - getUserEngagementMetrics(period: TimePeriod): SessionMetrics
}
```

### ExternalAnalyticsService
```
ExternalAnalyticsService {
  - sendToGoogleAnalytics(event: ReviewEvent): void
  - trackUserActivity(activity: UserActivityRecorded): void
  - generateExternalReport(data: ReportData): void
}
```