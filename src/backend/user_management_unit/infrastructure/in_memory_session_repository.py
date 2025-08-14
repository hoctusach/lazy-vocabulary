from typing import Dict, Optional, List
from ..domain.entities.user_session import UserSession
from ..domain.value_objects.user_id import UserId
from ..domain.value_objects.session_id import SessionId
from ..domain.repositories.session_repository import SessionRepository

class InMemorySessionRepository(SessionRepository):
    def __init__(self):
        self._sessions: Dict[str, UserSession] = {}
        self._user_sessions: Dict[str, List[str]] = {}
    
    def save(self, session: UserSession) -> None:
        self._sessions[session.session_id.value] = session
        
        user_id = session.user_id.value
        if user_id not in self._user_sessions:
            self._user_sessions[user_id] = []
        self._user_sessions[user_id].append(session.session_id.value)
    
    def find_by_session_id(self, session_id: SessionId) -> Optional[UserSession]:
        return self._sessions.get(session_id.value)
    
    def find_active_by_user_id(self, user_id: UserId) -> List[UserSession]:
        session_ids = self._user_sessions.get(user_id.value, [])
        return [self._sessions[sid] for sid in session_ids 
                if sid in self._sessions and self._sessions[sid].is_active]
    
    def delete_expired(self) -> None:
        # Simple implementation - in real scenario would check timestamps
        pass