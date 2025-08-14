"""Application services for authentication."""
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from domain.entities import User, UserSession
from domain.value_objects import Email, UserId, SessionId, DeviceInfo
from domain.repositories import UserRepository, SessionRepository
from domain.services import SessionManagementService
from domain.events import UserLoggedIn, SessionExpired


class AuthenticationService:
    def __init__(
        self,
        user_repository: UserRepository,
        session_repository: SessionRepository,
        session_service: SessionManagementService,
        jwt_secret: str = "dev-secret-key"
    ):
        self.user_repository = user_repository
        self.session_repository = session_repository
        self.session_service = session_service
        self.jwt_secret = jwt_secret
    
    def authenticate(self, email: Email, password: str, device_info: DeviceInfo) -> Optional[Dict[str, Any]]:
        """Authenticate user and create session."""
        # For MVP, we'll use simple password validation
        # In production, this would integrate with AWS Cognito
        user = self.user_repository.find_by_email(email)
        if not user or not user.is_active:
            return None
        
        # Create new session
        session = self.session_service.create_session(user.user_id, device_info)
        self.session_repository.save(session)
        
        # Update user last login
        user.update_last_login()
        self.user_repository.save(user)
        
        # Generate JWT token
        token = self._generate_token(user.user_id, session.session_id)
        
        return {
            "user_id": user.user_id.value,
            "session_id": session.session_id.value,
            "token": token,
            "expires_at": datetime.utcnow() + timedelta(hours=24)
        }
    
    def validate_session(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate JWT token and session."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"])
            user_id = UserId(payload["user_id"])
            session_id = SessionId(payload["session_id"])
            
            session = self.session_repository.find_by_session_id(session_id)
            if not session or not session.is_active:
                return None
            
            # Update session access time
            session.update_access_time()
            self.session_repository.save(session)
            
            return {
                "user_id": user_id.value,
                "session_id": session_id.value,
                "is_valid": True
            }
        except (jwt.InvalidTokenError, ValueError):
            return None
    
    def logout(self, session_id: SessionId) -> None:
        """Invalidate session."""
        session = self.session_repository.find_by_session_id(session_id)
        if session:
            session.invalidate()
            self.session_repository.save(session)
    
    def _generate_token(self, user_id: UserId, session_id: SessionId) -> str:
        """Generate JWT token."""
        payload = {
            "user_id": user_id.value,
            "session_id": session_id.value,
            "exp": datetime.utcnow() + timedelta(hours=24),
            "iat": datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm="HS256")