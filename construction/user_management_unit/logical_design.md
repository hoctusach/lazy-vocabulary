# User Management Unit - Logical Design

## Architecture Overview
Event-driven microservice handling authentication, user registration, and multi-device session management.

## API Layer

### REST Endpoints
```
POST /api/auth/register
POST /api/auth/login  
POST /api/auth/logout
GET /api/auth/session/validate
DELETE /api/auth/session/{sessionId}
GET /api/users/{userId}/sessions
```

### Request/Response Models
```python
# Registration
RegisterRequest: email, nickname, password
RegisterResponse: userId, token, expiresAt

# Authentication  
LoginRequest: email, password, deviceInfo
LoginResponse: userId, token, sessionId, expiresAt

# Session validation
ValidateSessionRequest: token
ValidateSessionResponse: userId, sessionId, isValid
```

## Application Services

### UserRegistrationService
```python
class UserRegistrationService:
    def register_user(self, request: RegisterRequest) -> RegisterResponse:
        # 1. Validate email uniqueness
        # 2. Create User aggregate
        # 3. Publish UserRegistered event
        # 4. Generate JWT token
        # 5. Return response
```

### AuthenticationService  
```python
class AuthenticationService:
    def authenticate(self, request: LoginRequest) -> LoginResponse:
        # 1. Validate credentials with Cognito
        # 2. Create UserSession
        # 3. Publish UserLoggedIn event
        # 4. Generate JWT token
        # 5. Return response
        
    def validate_session(self, token: str) -> ValidateSessionResponse:
        # 1. Decode JWT token
        # 2. Check session validity
        # 3. Return validation result
```

### SessionManagementService
```python
class SessionManagementService:
    def create_session(self, userId: UserId, deviceInfo: DeviceInfo) -> UserSession:
        # 1. Create new session
        # 2. Store in repository
        # 3. Return session
        
    def invalidate_session(self, sessionId: SessionId) -> None:
        # 1. Mark session as inactive
        # 2. Publish SessionExpired event
```

## Event Handling

### Event Publishers
```python
class UserEventPublisher:
    def publish_user_registered(self, event: UserRegistered) -> None
    def publish_user_logged_in(self, event: UserLoggedIn) -> None
    def publish_session_expired(self, event: SessionExpired) -> None
```

### Event Subscribers
```python
# No inbound events for this unit (independent)
```

## Data Layer

### Repository Implementations
```python
class CognitoUserRepository(UserRepository):
    def save(self, user: User) -> None:
        # Store in AWS Cognito
        
    def find_by_email(self, email: Email) -> User:
        # Query Cognito by email

class DynamoDBSessionRepository(SessionRepository):
    def save(self, session: UserSession) -> None:
        # Store in DynamoDB with TTL
        
    def find_active_by_user_id(self, userId: UserId) -> List[UserSession]:
        # Query active sessions
```

### Data Models
```python
# DynamoDB Session Table
{
    "sessionId": "uuid",
    "userId": "uuid", 
    "deviceInfo": {...},
    "createdAt": "timestamp",
    "lastAccessedAt": "timestamp",
    "isActive": "boolean",
    "ttl": "timestamp"
}
```

## Integration Points

### Outbound Events
- **UserRegistered** → Analytics Unit (user tracking)
- **UserLoggedIn** → Analytics Unit (activity tracking)
- **SessionExpired** → Learning Progress Unit (cleanup)

### External Dependencies
- **AWS Cognito** for user authentication
- **DynamoDB** for session storage
- **EventBridge** for event publishing

## Scalability Patterns

### Async Processing
```python
# Session cleanup via scheduled Lambda
def cleanup_expired_sessions():
    expired_sessions = session_repository.find_expired()
    for session in expired_sessions:
        session_service.invalidate_session(session.sessionId)
```

### Caching Strategy
```python
# Redis cache for active sessions
class CachedSessionRepository:
    def find_by_session_id(self, sessionId: SessionId) -> UserSession:
        # 1. Check Redis cache
        # 2. Fallback to DynamoDB
        # 3. Cache result
```

## File Structure
```
src/
├── api/
│   ├── auth_controller.py
│   └── models/
├── application/
│   ├── user_registration_service.py
│   ├── authentication_service.py
│   └── session_management_service.py
├── domain/
│   ├── entities/
│   ├── value_objects/
│   ├── events/
│   └── services/
├── infrastructure/
│   ├── repositories/
│   ├── event_publishers/
│   └── external/
└── config/
```

## Deployment
- **AWS Lambda** functions for API endpoints
- **API Gateway** for HTTP routing
- **DynamoDB** for session storage
- **EventBridge** for event publishing
- **CloudWatch** for monitoring