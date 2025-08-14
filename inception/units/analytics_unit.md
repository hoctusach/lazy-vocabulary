# Analytics Unit

## Overview
Handles usage analytics, administrative reporting, and performance metrics for content administrators.

## User Stories

### US-014: Track Active Users
- **As a** content administrator
- **I want** to see basic user activity metrics
- **So that** I can understand app usage patterns
- **Acceptance Criteria:**
  - System tracks daily/weekly/monthly active users
  - Analytics dashboard shows user engagement trends
  - Data aggregated to protect individual privacy
  - Metrics update daily via automated process
  - Basic charts and numbers (no complex visualizations)

### US-015: Review Count Analytics
- **As a** content administrator
- **I want** to see vocabulary review statistics
- **So that** I can understand which content is most/least used
- **Acceptance Criteria:**
  - System tracks total reviews per vocabulary word
  - Analytics show most/least reviewed words
  - Data helps identify content gaps or popular topics
  - Aggregated data only (no individual user data)
  - System sends review events to Google Analytics for tracking

### US-016: Accuracy Analytics
- **As a** content administrator
- **I want** to see learning accuracy metrics
- **So that** I can identify difficult vocabulary that may need improvement
- **Acceptance Criteria:**
  - System calculates accuracy rates per vocabulary word
  - Analytics identify words with low success rates
  - Data helps improve content quality and difficulty
  - Aggregated across all users for privacy

## Dependencies
- **Outbound**: None (reporting only)
- **Inbound**: Consumes review events from Learning Progress Unit and user activity from User Management Unit

## Technical Scope
- Event aggregation and processing
- Analytics dashboard
- Privacy-compliant data aggregation
- Google Analytics integration