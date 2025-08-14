# Lazy Voca Cloud Backend - User Stories (MVP)

## Problem Statement
Progress is currently stored locally on each device, preventing multi-device learning and risking data loss.

## Goals
- Store learner identity (email, nickname) and progress in the backend
- Allow seamless learning across devices
- Lay groundwork for advanced features (analytics, spaced repetition)
- Maintain low cost and minimal operational overhead

## Non-Goals (MVP)
- No major UI/UX redesign
- No social or community features  
- No complex admin dashboard beyond basic content import

## User Personas

### Primary Persona: Lazy Voca Learner
- **Current Pain**: Cannot continue learning on different devices, risk losing progress
- **Goal**: Seamless vocabulary learning across phone, tablet, computer
- **Success Metric**: Can switch devices and resume learning within 5 seconds

### Secondary Persona: Content Administrator
- **Goal**: Upload and manage vocabulary content and audio assets
- **Scope**: Basic content management only (no complex dashboard)

## User Stories by Functional Requirement

### FR1: Account & Auth

**US-001: Sign Up with Email and Nickname**
- **As a** Lazy Voca learner
- **I want to** create an account with my email and nickname
- **So that** my progress can be saved to the cloud
- **Acceptance Criteria:**
  - User provides email and nickname during registration
  - System validates email format and uniqueness
  - System creates AWS Cognito user account
  - No complex profile fields required (MVP scope)
  - Account is immediately active (no email verification required)

**US-002: Sign In to Access Cloud Progress**
- **As a** Lazy Voca learner  
- **I want to** sign in with my email and password
- **So that** I can access my progress from any device
- **Acceptance Criteria:**
  - User authenticates via AWS Cognito
  - System returns JWT token for API access
  - Failed attempts are rate-limited for security
  - System saves logged-in user credentials in browser storage
  - Auto-login on app restart using saved user session
  - Session persists across browser sessions

### FR2: Multi-Device Sync

**US-003: Real-time Progress Synchronization**
- **As a** Lazy Voca learner
- **I want** my learning progress to sync across devices in real-time
- **So that** I can seamlessly continue learning on any device
- **Acceptance Criteria:**
  - Progress updates sync within 5 seconds across devices
  - Server is source of truth for all progress data
  - Conflicts resolved using timestamp-based merging
  - Offline changes sync when connection restored
  - Idempotent event handling prevents duplicate updates

**US-004: Device Session Management**
- **As a** Lazy Voca learner
- **I want** the system to handle multiple active sessions
- **So that** I can use the app on multiple devices simultaneously
- **Acceptance Criteria:**
  - Multiple devices can be logged in simultaneously
  - Progress from any device updates all other devices
  - Last-write-wins conflict resolution for same-timestamp events
  - Session invalidation on explicit logout

### FR3: Vocabulary Access API

**US-005: Retrieve Vocabulary by Category**
- **As a** Lazy Voca learner
- **I want** to access vocabulary organized by categories
- **So that** I can focus on specific types of vocabulary (phrasal verbs, idioms, etc.)
- **Acceptance Criteria:**
  - API endpoint returns vocabulary filtered by category
  - Supports existing categories: "phrasal verbs", "idioms"
  - Response includes word, meaning, example, translation, count
  - API response time p95 < 400ms
  - Pagination support for large categories

**US-006: Search Vocabulary**
- **As a** Lazy Voca learner
- **I want** to search for specific vocabulary words
- **So that** I can quickly find and review particular words
- **Acceptance Criteria:**
  - API supports text search across word, meaning, example fields
  - Search is case-insensitive and supports partial matches
  - Results ranked by relevance
  - Search response time p95 < 400ms

### FR4: Daily List Generation

**US-007: Generate Daily Learning List**
- **As a** Lazy Voca learner
- **I want** the system to generate my daily learning list following FR2 rules
- **So that** I get an optimal mix of review and new vocabulary
- **Acceptance Criteria:**
  - System follows existing FR2 algorithm for mixing review/new items
  - List generation considers individual progress and SRS scheduling
  - API endpoint returns personalized daily word list
  - List size configurable per user preferences
  - Generation algorithm maintains existing learning effectiveness

### FR5: Progress Tracking

**US-008: Record Review Events**
- **As a** Lazy Voca learner
- **I want** my review sessions to be recorded in the cloud
- **So that** my progress is tracked and influences future learning
- **Acceptance Criteria:**
  - System records each word review event with timestamp
  - Captures response accuracy (correct/incorrect)
  - Stores response time for performance analytics
  - Events are immutable once recorded
  - Batch API for recording multiple events efficiently

**US-009: SRS Scheduling Data**
- **As a** Lazy Voca learner
- **I want** the system to maintain SRS scheduling for each word
- **So that** words appear for review at optimal intervals
- **Acceptance Criteria:**
  - System stores next review date for each word per user
  - SRS algorithm updates intervals based on review performance
  - Scheduling data syncs across devices immediately
  - Algorithm maintains compatibility with existing local SRS logic

### FR6: Data Import

**US-010: Migration Dialog for Existing Users**
- **As an** existing Lazy Voca user (who used the app before server integration)
- **I want** to see a migration dialog when I first open the updated app
- **So that** I can choose to migrate my local progress to the cloud
- **Acceptance Criteria:**
  - App detects existing local progress data on first launch after server update
  - System shows migration dialog with options: "Migrate to Cloud" or "Continue Locally"
  - Dialog explains benefits of cloud sync (multi-device access, backup)
  - User can dismiss dialog and decide later
  - Dialog only appears once per installation

**US-011: Import Local Progress to Cloud**
- **As an** existing Lazy Voca user
- **I want** to import my existing local progress to the cloud
- **So that** I don't lose my learning history when switching to cloud sync
- **Acceptance Criteria:**
  - System accepts local progress data from current app storage
  - Import merges local data with any existing cloud data
  - Merge logic uses timestamps to resolve conflicts
  - Import process is idempotent (safe to run multiple times)
  - User receives confirmation of successful import with summary

### FR7: Basic Admin Tools

**US-012: Upload Vocabulary Content**
- **As a** content administrator
- **I want** to upload new vocabulary and update existing content
- **So that** learners have access to fresh vocabulary
- **Acceptance Criteria:**
  - Admin can upload vocabulary in JSON format matching existing structure
  - System validates vocabulary data format before import
  - Bulk upload supports adding new categories
  - Changes are immediately available to all users
  - Simple web interface for upload (no complex dashboard)

**US-013: Upload Audio Assets**
- **As a** content administrator  
- **I want** to upload and manage audio files for vocabulary
- **So that** learners can hear pronunciation
- **Acceptance Criteria:**
  - Admin can upload audio files to S3
  - System maps audio files to vocabulary words
  - Audio files are served via CDN for fast access
  - Supports common audio formats (MP3, WAV)
  - Basic file management (upload, replace, delete)

### FR8: Basic Analytics

**US-014: Track Active Users**
- **As a** content administrator
- **I want** to see basic user activity metrics
- **So that** I can understand app usage patterns
- **Acceptance Criteria:**
  - System tracks daily/weekly/monthly active users
  - Analytics dashboard shows user engagement trends
  - Data aggregated to protect individual privacy
  - Metrics update daily via automated process
  - Basic charts and numbers (no complex visualizations)

**US-015: Review Count Analytics**
- **As a** content administrator
- **I want** to see vocabulary review statistics
- **So that** I can understand which content is most/least used
- **Acceptance Criteria:**
  - System tracks total reviews per vocabulary word
  - Analytics show most/least reviewed words
  - Data helps identify content gaps or popular topics
  - Aggregated data only (no individual user data)
  - System sends review events to Google Analytics for tracking

**US-016: Accuracy Analytics**
- **As a** content administrator
- **I want** to see learning accuracy metrics
- **So that** I can identify difficult vocabulary that may need improvement
- **Acceptance Criteria:**
  - System calculates accuracy rates per vocabulary word
  - Analytics identify words with low success rates
  - Data helps improve content quality and difficulty
  - Aggregated across all users for privacy

## Non-Functional Requirements

### Performance & Scalability
- **NFR-001**: API response time p95 < 400ms
- **NFR-002**: Support 100K monthly active users
- **NFR-003**: 99.9% uptime availability

### Security & Privacy  
- **NFR-004**: Minimal PII collection (email, nickname only)
- **NFR-005**: Encryption in transit (HTTPS) and at rest
- **NFR-006**: AWS security best practices implementation

### Cost Optimization
- **NFR-007**: Target <$200/month operational cost for 10K MAU
- **NFR-008**: Serverless architecture for cost efficiency
- **NFR-009**: Automated scaling to minimize idle costs

### Technical Architecture
- **NFR-010**: AWS Cognito for authentication
- **NFR-011**: API Gateway + Lambda for serverless API
- **NFR-012**: Aurora Serverless PostgreSQL for database
- **NFR-013**: S3 for asset storage with CloudFront CDN
- **NFR-014**: EventBridge/SQS for async processing
- **NFR-015**: CloudWatch/X-Ray for monitoring and observability

## Success Criteria (MVP)
- Users can sign in and see progress saved from server
- Users can learn on one device and resume on another within 5 seconds  
- Import from local storage works without data loss
- Admin can upload vocabulary and audio mappings
- Performance and error rates meet specified targets
- System operates within cost constraints

---

**Total User Stories**: 16
**Functional Requirements Covered**: 8/8
**Architecture**: AWS serverless stack for low cost and minimal operational overhead

This focused set of user stories addresses the core problem of multi-device learning while maintaining MVP scope and cost constraints.