# User Management Unit

## Overview
The User Management Unit handles user authentication, account creation, and multi-device session management for the Lazy Vocabulary application. It implements Domain-Driven Design principles with a clean architecture.

## Features
- ✅ User registration with email and nickname
- ✅ User authentication and login
- ✅ Multi-device session management
- ✅ JWT token-based authentication
- ✅ Session validation and logout
- ✅ In-memory repositories for local testing
- 🔄 AWS Cognito integration (requires credentials)

## Architecture

### Domain Layer
- **Entities**: User, UserSession
- **Value Objects**: Email, Nickname, UserId, SessionId, DeviceInfo
- **Domain Events**: UserRegistered, UserLoggedIn, SessionExpired
- **Domain Services**: UserRegistrationService, SessionManagementService
- **Repositories**: UserRepository, SessionRepository (interfaces)

### Application Layer
- **AuthenticationService**: Handles login, logout, session validation
- **UserRegistrationApplicationService**: Handles user registration

### Infrastructure Layer
- **InMemoryUserRepository**: In-memory user storage for testing
- **InMemorySessionRepository**: In-memory session storage for testing

### API Layer
- **AuthController**: REST API endpoints for authentication
- **Models**: Request/response data models

## API Endpoints

### POST /api/auth/register
Register a new user.
```json
{
  "email": "user@example.com",
  "nickname": "UserName",
  "password": "password123"
}
```

### POST /api/auth/login
Authenticate user and create session.
```json
{
  "email": "user@example.com",
  "password": "password123",
  "device_type": "web",
  "user_agent": "Browser",
  "ip_address": "127.0.0.1"
}
```

### POST /api/auth/validate
Validate user session.
```json
{
  "token": "jwt_token_here"
}
```

### POST /api/auth/logout
Logout user and invalidate session.
```json
{
  "session_id": "session_uuid_here"
}
```

### GET /health
Health check endpoint.

## Quick Start

### 1. Test Core Functionality
```bash
cd src/backend/user_management_unit
python simple_demo.py
```

### 2. Start API Server
```bash
python start_server.py
```
The server will start on `http://localhost:8001`

### 3. Test API Endpoints
Use curl, Postman, or any HTTP client to test the endpoints:

```bash
# Register user
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","nickname":"TestUser","password":"pass123"}'

# Login
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","device_type":"web"}'
```

## Dependencies
- `fastapi`: Web framework
- `uvicorn`: ASGI server
- `pyjwt`: JWT token handling
- `python-multipart`: Form data support

## Configuration
- JWT Secret: Configurable via `UserManagementServiceFactory`
- Token Expiration: 24 hours (configurable)
- Server Port: 8001 (configurable in server.py)

## Multi-Device Support
The system supports multiple active sessions per user:
- Each login creates a new session
- Sessions are tracked independently
- Users can be logged in on multiple devices simultaneously
- Session invalidation is per-device

## Security Features
- Email format validation
- Nickname length validation (3-50 characters)
- UUID-based user and session IDs
- JWT token expiration
- Session-based authentication
- Input validation and error handling

## Future Enhancements
- AWS Cognito integration for production authentication
- Password reset functionality
- Session cleanup scheduler
- Rate limiting
- Audit logging
- Email verification

## Testing
Run the simple demo to verify core functionality:
```bash
python simple_demo.py
```

Expected output shows successful:
- User creation and validation
- Duplicate email prevention
- Session management
- Multi-device sessions
- Value object validation

## Integration with Frontend
The API is designed to integrate with the existing Lazy Vocabulary frontend:
1. Replace local authentication with API calls
2. Store JWT tokens in browser storage
3. Include tokens in API requests for other services
4. Handle session expiration and renewal

## AWS Cognito Integration
To enable AWS Cognito (requires AWS credentials):
1. Set up AWS Cognito User Pool
2. Configure AWS credentials
3. Implement CognitoUserRepository
4. Update service factory configuration
5. Deploy to AWS Lambda with API Gateway