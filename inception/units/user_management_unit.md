# User Management Unit

## Overview
Handles user authentication, account creation, and session management across devices.

## User Stories

### US-001: Sign Up with Email and Nickname
- **As a** Lazy Voca learner
- **I want to** create an account with my email and nickname
- **So that** my progress can be saved to the cloud
- **Acceptance Criteria:**
  - User provides email and nickname during registration
  - System validates email format and uniqueness
  - System creates AWS Cognito user account
  - No complex profile fields required (MVP scope)
  - Account is immediately active (no email verification required)

### US-002: Sign In to Access Cloud Progress
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

### US-004: Device Session Management
- **As a** Lazy Voca learner
- **I want** the system to handle multiple active sessions
- **So that** I can use the app on multiple devices simultaneously
- **Acceptance Criteria:**
  - Multiple devices can be logged in simultaneously
  - Progress from any device updates all other devices
  - Last-write-wins conflict resolution for same-timestamp events
  - Session invalidation on explicit logout

## Dependencies
- **Outbound**: Provides user identity context to other units
- **Inbound**: None (independent unit)

## Technical Scope
- AWS Cognito integration
- JWT token management
- Session handling
- Multi-device authentication