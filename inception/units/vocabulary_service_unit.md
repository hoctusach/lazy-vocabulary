# Vocabulary Service Unit

## Overview
Manages vocabulary content, search functionality, and content administration.

## User Stories

### US-005: Retrieve Vocabulary by Category
- **As a** Lazy Voca learner
- **I want** to access vocabulary organized by categories
- **So that** I can focus on specific types of vocabulary (phrasal verbs, idioms, etc.)
- **Acceptance Criteria:**
  - API endpoint returns vocabulary filtered by category
  - Supports existing categories: "phrasal verbs", "idioms"
  - Response includes word, meaning, example, translation, count
  - API response time p95 < 400ms
  - Pagination support for large categories

### US-006: Search Vocabulary
- **As a** Lazy Voca learner
- **I want** to search for specific vocabulary words
- **So that** I can quickly find and review particular words
- **Acceptance Criteria:**
  - API supports text search across word, meaning, example fields
  - Search is case-insensitive and supports partial matches
  - Results ranked by relevance
  - Search response time p95 < 400ms

### US-012: Upload Vocabulary Content
- **As a** content administrator
- **I want** to upload new vocabulary and update existing content
- **So that** learners have access to fresh vocabulary
- **Acceptance Criteria:**
  - Admin can upload vocabulary in JSON format matching existing structure
  - System validates vocabulary data format before import
  - Bulk upload supports adding new categories
  - Changes are immediately available to all users
  - Simple web interface for upload (no complex dashboard)

### US-013: Upload Audio Assets
- **As a** content administrator  
- **I want** to upload and manage audio files for vocabulary
- **So that** learners can hear pronunciation
- **Acceptance Criteria:**
  - Admin can upload audio files to S3
  - System maps audio files to vocabulary words
  - Audio files are served via CDN for fast access
  - Supports common audio formats (MP3, WAV)
  - Basic file management (upload, replace, delete)

## Dependencies
- **Outbound**: Provides vocabulary data to Learning Progress Unit
- **Inbound**: Requires user authentication from User Management Unit for admin functions

## Technical Scope
- Vocabulary database management
- Search and filtering APIs
- Content upload and validation
- S3 and CloudFront integration for audio assets