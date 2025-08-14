"""Domain services for User Management."""
from datetime import datetime
from typing import Optional

from domain.entities import User, UserSession
from domain.value_objects import UserId, Email, Nickname, DeviceInfo, SessionId
from domain.repositories import UserRepository


class UserRegistrationService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
    
    def can_register(self, email: Email) -> bool:
        return not self.user_repository.exists_by_email(email)
    
    def create_user(self, email: Email, nickname: Nickname) -> User:
        if not self.can_register(email):
            raise ValueError(f"User with email {email.value} already exists")
        
        return User(
            user_id=UserId.generate(),
            email=email,
            nickname=nickname,
            created_at=datetime.utcnow()
        )


class SessionManagementService:
    def create_session(self, user_id: UserId, device_info: DeviceInfo) -> UserSession:
        return UserSession(
            session_id=SessionId.generate(),
            user_id=user_id,
            device_info=device_info,
            created_at=datetime.utcnow(),
            last_accessed_at=datetime.utcnow()
        )