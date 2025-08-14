from datetime import datetime
from typing import Optional
from ..entities.user import User
from ..entities.user_session import UserSession
from ..value_objects.user_id import UserId
from ..value_objects.session_id import SessionId
from ..value_objects.email import Email
from ..value_objects.device_info import DeviceInfo
from ..repositories.user_repository import UserRepository
from ..repositories.session_repository import SessionRepository

class AuthenticationService:
    def __init__(self, user_repo: UserRepository, session_repo: SessionRepository):
        self.user_repo = user_repo
        self.session_repo = session_repo
    
    def authenticate(self, email: Email, password: str, device_info: DeviceInfo) -> Optional[UserSession]:
        user = self.user_repo.find_by_email(email)
        if not user or not user.is_active:
            return None
        
        # Simple password check (in real implementation, use proper hashing)
        if password != "password":  # Simplified for demo
            return None
        
        session = UserSession(
            session_id=SessionId.generate(),
            user_id=user.user_id,
            device_info=device_info,
            created_at=datetime.now(),
            last_accessed_at=datetime.now()
        )
        
        self.session_repo.save(session)
        return session
    
    def validate_session(self, session_id: SessionId) -> bool:
        session = self.session_repo.find_by_session_id(session_id)
        return session is not None and session.is_active