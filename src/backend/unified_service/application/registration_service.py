"""Application service for user registration."""
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any

from domain.entities import User
from domain.value_objects import Email, Nickname, UserId
from domain.repositories import UserRepository
from domain.services import UserRegistrationService
from domain.events import UserRegistered


class UserRegistrationApplicationService:
    def __init__(
        self,
        user_repository: UserRepository,
        registration_service: UserRegistrationService,
        jwt_secret: str = "dev-secret-key"
    ):
        self.user_repository = user_repository
        self.registration_service = registration_service
        self.jwt_secret = jwt_secret
    
    def register_user(self, email_str: str, nickname_str: str, password: str) -> Dict[str, Any]:
        """Register new user."""
        email = Email(email_str)
        nickname = Nickname(nickname_str)
        
        # Create user through domain service
        user = self.registration_service.create_user(email, nickname)
        
        # Save user
        self.user_repository.save(user)
        
        # Generate initial token
        token = self._generate_token(user.user_id)
        
        return {
            "user_id": user.user_id.value,
            "email": user.email.value,
            "nickname": user.nickname.value,
            "token": token,
            "expires_at": datetime.utcnow() + timedelta(hours=24)
        }
    
    def _generate_token(self, user_id: UserId) -> str:
        """Generate JWT token for new user."""
        payload = {
            "user_id": user_id.value,
            "exp": datetime.utcnow() + timedelta(hours=24),
            "iat": datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm="HS256")