# User Management Unit

A Domain-Driven Design implementation of user authentication and session management for the Lazy Vocabulary application.

## Architecture

### Domain Layer
- **Entities**: User, UserSession
- **Value Objects**: UserId, SessionId, Email, Nickname, DeviceInfo
- **Domain Events**: UserRegistered, UserLoggedIn, SessionExpired
- **Domain Services**: AuthenticationService, UserRegistrationService
- **Repository Interfaces**: UserRepository, SessionRepository

### Application Layer
- **UserManagementFacade**: Main application service orchestrating user operations
- **EventPublisher**: Publishes domain events

### Infrastructure Layer
- **InMemoryUserRepository**: In-memory implementation of UserRepository
- **InMemorySessionRepository**: In-memory implementation of SessionRepository

### API Layer
- **AuthController**: REST API controller for authentication endpoints
- **Models**: Request/response data models

## Usage

### Running the Demo
```bash
# From the project root
python -m src.backend.user_management_unit.complete_demo
```

### Integration Example
```python
from src.backend.user_management_unit.infrastructure.in_memory_user_repository import InMemoryUserRepository
from src.backend.user_management_unit.infrastructure.in_memory_session_repository import InMemorySessionRepository
from src.backend.user_management_unit.domain.services.authentication_service import AuthenticationService
from src.backend.user_management_unit.domain.services.user_registration_service import UserRegistrationService
from src.backend.user_management_unit.application.event_publisher import EventPublisher
from src.backend.user_management_unit.application.user_management_facade import UserManagementFacade

# Setup
user_repo = InMemoryUserRepository()
session_repo = InMemorySessionRepository()
auth_service = AuthenticationService(user_repo, session_repo)
registration_service = UserRegistrationService(user_repo)
event_publisher = EventPublisher()

facade = UserManagementFacade(auth_service, registration_service, event_publisher)

# Register user
user = facade.register_user("user@example.com", "Username", "password")

# Login
session = facade.login("user@example.com", "password", "web")

# Validate session
is_valid = facade.validate_session(session.session_id.value)
```

## Features

- ✅ User registration with email validation
- ✅ User authentication with session management
- ✅ Multi-device session support
- ✅ Domain event publishing
- ✅ In-memory storage for demo purposes
- ✅ RESTful API layer
- ✅ Comprehensive error handling
- ✅ Domain-driven design principles

## Next Steps for Production

1. Replace in-memory repositories with persistent storage (PostgreSQL, DynamoDB)
2. Implement proper password hashing (bcrypt, Argon2)
3. Add JWT token generation and validation
4. Implement session expiration and cleanup
5. Add rate limiting and security measures
6. Connect to external authentication providers (AWS Cognito)
7. Add comprehensive logging and monitoring