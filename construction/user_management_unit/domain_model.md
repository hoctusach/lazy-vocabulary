# User Management Unit - Domain Model

## Domain Overview
Manages user identity, authentication, and multi-device session handling.

## Aggregates

### User Aggregate
**Root Entity**: User
**Consistency Boundary**: User account and all associated sessions
**Invariants**: 
- Email must be unique across system
- User can have multiple active sessions
- Sessions belong to exactly one user

## Entities

### User (Aggregate Root)
```
User {
  - userId: UserId (Identity)
  - email: Email (Value Object)
  - nickname: Nickname (Value Object)
  - createdAt: DateTime
  - lastLoginAt: DateTime
  - isActive: Boolean
}
```

### UserSession (Entity)
```
UserSession {
  - sessionId: SessionId (Identity)
  - userId: UserId
  - deviceInfo: DeviceInfo (Value Object)
  - createdAt: DateTime
  - lastAccessedAt: DateTime
  - isActive: Boolean
}
```

## Value Objects

### Email
```
Email {
  - value: String
  - validate(): Boolean
}
```

### Nickname
```
Nickname {
  - value: String
  - validate(): Boolean (3-50 chars)
}
```

### DeviceInfo
```
DeviceInfo {
  - deviceType: String
  - userAgent: String
  - ipAddress: String
}
```

### UserId, SessionId
```
Identity value objects with UUID values
```

## Domain Events

### UserRegistered
```
UserRegistered {
  - userId: UserId
  - email: Email
  - nickname: Nickname
  - occurredAt: DateTime
}
```

### UserLoggedIn
```
UserLoggedIn {
  - userId: UserId
  - sessionId: SessionId
  - deviceInfo: DeviceInfo
  - occurredAt: DateTime
}
```

### SessionExpired
```
SessionExpired {
  - userId: UserId
  - sessionId: SessionId
  - occurredAt: DateTime
}
```

## Policies

### UniqueEmailPolicy
Ensures email uniqueness during registration

### SessionManagementPolicy
Handles multi-device session lifecycle and cleanup

## Repositories

### UserRepository
```
UserRepository {
  - findByEmail(email: Email): User
  - findById(userId: UserId): User
  - save(user: User): void
  - existsByEmail(email: Email): Boolean
}
```

### SessionRepository
```
SessionRepository {
  - findBySessionId(sessionId: SessionId): UserSession
  - findActiveByUserId(userId: UserId): List<UserSession>
  - save(session: UserSession): void
  - deleteExpired(): void
}
```

## Domain Services

### AuthenticationService
```
AuthenticationService {
  - authenticate(email: Email, password: String): AuthResult
  - createSession(userId: UserId, deviceInfo: DeviceInfo): UserSession
  - validateSession(sessionId: SessionId): Boolean
}
```

### UserRegistrationService
```
UserRegistrationService {
  - registerUser(email: Email, nickname: Nickname, password: String): User
  - validateRegistration(email: Email, nickname: Nickname): ValidationResult
}
```