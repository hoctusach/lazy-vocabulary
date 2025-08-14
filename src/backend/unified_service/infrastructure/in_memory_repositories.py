"""In-memory repository implementations for testing."""
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from domain.entities import User, UserSession
from domain.value_objects import UserId, SessionId, Email
from domain.repositories import UserRepository, SessionRepository


class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self._users: Dict[str, User] = {}
        self._email_index: Dict[str, str] = {}  # email -> user_id
    
    def find_by_email(self, email: Email) -> Optional[User]:
        user_id = self._email_index.get(email.value)
        return self._users.get(user_id) if user_id else None
    
    def find_by_id(self, user_id: UserId) -> Optional[User]:
        return self._users.get(user_id.value)
    
    def save(self, user: User) -> None:
        self._users[user.user_id.value] = user
        self._email_index[user.email.value] = user.user_id.value
    
    def exists_by_email(self, email: Email) -> bool:
        return email.value in self._email_index


class InMemorySessionRepository(SessionRepository):
    def __init__(self):
        self._sessions: Dict[str, UserSession] = {}
        self._user_sessions: Dict[str, List[str]] = {}  # user_id -> [session_ids]
    
    def find_by_session_id(self, session_id: SessionId) -> Optional[UserSession]:
        return self._sessions.get(session_id.value)
    
    def find_active_by_user_id(self, user_id: UserId) -> List[UserSession]:
        session_ids = self._user_sessions.get(user_id.value, [])
        sessions = []
        for session_id in session_ids:
            session = self._sessions.get(session_id)
            if session and session.is_active:
                sessions.append(session)
        return sessions
    
    def save(self, session: UserSession) -> None:
        self._sessions[session.session_id.value] = session
        
        # Update user sessions index
        user_id = session.user_id.value
        if user_id not in self._user_sessions:
            self._user_sessions[user_id] = []
        
        if session.session_id.value not in self._user_sessions[user_id]:
            self._user_sessions[user_id].append(session.session_id.value)
    
    def delete_expired(self) -> None:
        """Remove sessions older than 24 hours."""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)
        expired_sessions = []
        
        for session_id, session in self._sessions.items():
            if session.last_accessed_at < cutoff_time:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            session = self._sessions.pop(session_id, None)
            if session:
                user_sessions = self._user_sessions.get(session.user_id.value, [])
                if session_id in user_sessions:
                    user_sessions.remove(session_id)