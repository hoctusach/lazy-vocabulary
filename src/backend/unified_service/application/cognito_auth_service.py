"""Cognito-based authentication service."""
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from domain.entities import User, UserSession
from domain.value_objects import Email, UserId, SessionId, DeviceInfo, Nickname
from domain.repositories import SessionRepository
from domain.services import SessionManagementService, UserRegistrationService
from infrastructure.cognito_repositories import CognitoUserRepository


class CognitoAuthenticationService:
    def __init__(
        self,
        cognito_user_repo: CognitoUserRepository,
        session_repository: SessionRepository,
        session_service: SessionManagementService,
        registration_service: UserRegistrationService,
        jwt_secret: str = "dev-secret-key"
    ):
        self.cognito_user_repo = cognito_user_repo
        self.session_repository = session_repository
        self.session_service = session_service
        self.registration_service = registration_service
        self.jwt_secret = jwt_secret
    
    def register(self, email: Email, nickname: Nickname, password: str) -> Dict[str, Any]:
        """Register user with Cognito."""
        # Create user through domain service
        user = self.registration_service.create_user(email, nickname)
        
        # Create user in Cognito with password
        try:
            self.cognito_user_repo.cognito.admin_create_user(
                UserPoolId=self.cognito_user_repo.user_pool_id,
                Username=email.value,
                UserAttributes=[
                    {'Name': 'email', 'Value': email.value},
                    {'Name': 'nickname', 'Value': nickname.value}
                ],
                TemporaryPassword=password,
                MessageAction='SUPPRESS'
            )
            
            # Set permanent password and confirm user
            self.cognito_user_repo.cognito.admin_set_user_password(
                UserPoolId=self.cognito_user_repo.user_pool_id,
                Username=email.value,
                Password=password,
                Permanent=True
            )
            
            self.cognito_user_repo.cognito.admin_confirm_sign_up(
                UserPoolId=self.cognito_user_repo.user_pool_id,
                Username=email.value
            )
        except Exception as e:
            raise ValueError(f"Failed to create user in Cognito: {str(e)}")
        
        # Generate token
        token = self._generate_token(user.user_id)
        
        return {
            "user_id": user.user_id.value,
            "email": user.email.value,
            "nickname": user.nickname.value,
            "token": token,
            "expires_at": datetime.utcnow() + timedelta(hours=24)
        }
    
    def authenticate(self, email: Email, password: str, device_info: DeviceInfo) -> Optional[Dict[str, Any]]:
        """Authenticate with Cognito."""
        # Authenticate with Cognito
        auth_result = self.cognito_user_repo.authenticate(email, password)
        if not auth_result:
            return None
        
        # Get user
        user = self.cognito_user_repo.find_by_email(email)
        if not user:
            return None
        
        # Create session
        session = self.session_service.create_session(user.user_id, device_info)
        self.session_repository.save(session)
        
        # Update last login
        user.update_last_login()
        
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
    
    def _generate_token(self, user_id: UserId, session_id: Optional[SessionId] = None) -> str:
        """Generate JWT token."""
        payload = {
            "user_id": user_id.value,
            "exp": datetime.utcnow() + timedelta(hours=24),
            "iat": datetime.utcnow()
        }
        if session_id:
            payload["session_id"] = session_id.value
        return jwt.encode(payload, self.jwt_secret, algorithm="HS256")