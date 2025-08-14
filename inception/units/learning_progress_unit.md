# Learning Progress Unit

## Overview
Tracks user learning progress, manages spaced repetition scheduling, and handles real-time synchronization across devices.

## User Stories

### US-003: Real-time Progress Synchronization
- **As a** Lazy Voca learner
- **I want** my learning progress to sync across devices in real-time
- **So that** I can seamlessly continue learning on any device
- **Acceptance Criteria:**
  - Progress updates sync within 5 seconds across devices
  - Server is source of truth for all progress data
  - Conflicts resolved using timestamp-based merging
  - Offline changes sync when connection restored
  - Idempotent event handling prevents duplicate updates

### US-007: Generate Daily Learning List
- **As a** Lazy Voca learner
- **I want** the system to generate my daily learning list following FR2 rules
- **So that** I get an optimal mix of review and new vocabulary
- **Acceptance Criteria:**
  - System follows existing FR2 algorithm for mixing review/new items
  - List generation considers individual progress and SRS scheduling
  - API endpoint returns personalized daily word list
  - List size configurable per user preferences
  - Generation algorithm maintains existing learning effectiveness

### US-008: Record Review Events
- **As a** Lazy Voca learner
- **I want** my review sessions to be recorded in the cloud
- **So that** my progress is tracked and influences future learning
- **Acceptance Criteria:**
  - System records each word review event with timestamp
  - Captures response accuracy (correct/incorrect)
  - Stores response time for performance analytics
  - Events are immutable once recorded
  - Batch API for recording multiple events efficiently

### US-009: SRS Scheduling Data
- **As a** Lazy Voca learner
- **I want** the system to maintain SRS scheduling for each word
- **So that** words appear for review at optimal intervals
- **Acceptance Criteria:**
  - System stores next review date for each word per user
  - SRS algorithm updates intervals based on review performance
  - Scheduling data syncs across devices immediately
  - Algorithm maintains compatibility with existing local SRS logic

## Dependencies
- **Outbound**: Provides review events to Analytics Unit
- **Inbound**: Requires user identity from User Management Unit and vocabulary data from Vocabulary Service Unit

## Technical Scope
- Progress tracking and synchronization
- Spaced repetition algorithm implementation
- Real-time event processing
- Daily list generation logic