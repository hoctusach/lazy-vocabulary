from datetime import datetime, timedelta
import uuid
from ..models.user_auth import User, Session, LoginRequest, LoginResponse
from ..storage.memory_store import memory_store

class UserService:
    def __init__(self):
        self.store = memory_store
    
    def login(self, request: LoginRequest) -> LoginResponse:
        """Login or create user"""
        user = self._get_or_create_user(request.email, request.nickname)
        session = self._create_session(user.user_id)
        return LoginResponse(user=user, session=session)
    
    def logout(self, session_id: str) -> bool:
        """Logout user session"""
        if session_id in self.store.sessions:
            del self.store.sessions[session_id]
        return True
    
    def validate_session(self, token: str) -> dict:
        """Validate session token"""
        for session_data in self.store.sessions.values():
            if session_data['token'] == token and datetime.fromisoformat(session_data['expires_at']) > datetime.now():
                return {"valid": True, "data": {"valid": True}}
        return {"valid": False}
    
    def _get_or_create_user(self, email: str, nickname: str) -> User:
        """Get existing user or create new one"""
        for user_data in self.store.users.values():
            if user_data['email'] == email:
                return User(**user_data)
        
        user = User(user_id=str(uuid.uuid4()), email=email, nickname=nickname)
        self.store.users[user.user_id] = user.dict()
        return user
    
    def _create_session(self, user_id: str) -> Session:
        """Create new session"""
        session = Session(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            token=str(uuid.uuid4()),
            expires_at=datetime.now() + timedelta(days=30)
        )
        self.store.sessions[session.session_id] = session.dict()
        return session