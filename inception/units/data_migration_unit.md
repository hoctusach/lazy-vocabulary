# Data Migration Unit

## Overview
Manages the one-time migration of existing local user data to cloud storage for seamless transition to the backend system.

## User Stories

### US-010: Migration Dialog for Existing Users
- **As an** existing Lazy Voca user (who used the app before server integration)
- **I want** to see a migration dialog when I first open the updated app
- **So that** I can choose to migrate my local progress to the cloud
- **Acceptance Criteria:**
  - App detects existing local progress data on first launch after server update
  - System shows migration dialog with options: "Migrate to Cloud" or "Continue Locally"
  - Dialog explains benefits of cloud sync (multi-device access, backup)
  - User can dismiss dialog and decide later
  - Dialog only appears once per installation

### US-011: Import Local Progress to Cloud
- **As an** existing Lazy Voca user
- **I want** to import my existing local progress to the cloud
- **So that** I don't lose my learning history when switching to cloud sync
- **Acceptance Criteria:**
  - System accepts local progress data from current app storage
  - Import merges local data with any existing cloud data
  - Merge logic uses timestamps to resolve conflicts
  - Import process is idempotent (safe to run multiple times)
  - User receives confirmation of successful import with summary

## Dependencies
- **Outbound**: Provides migrated data to Learning Progress Unit
- **Inbound**: Requires user authentication from User Management Unit

## Technical Scope
- Local storage detection and reading
- Data format conversion and validation
- Conflict resolution during merge
- One-time migration workflow
- User interface for migration process