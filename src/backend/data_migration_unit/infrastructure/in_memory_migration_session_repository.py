from typing import Dict, Optional
from ..domain.entities.migration_session import MigrationSession
from ..domain.value_objects.migration_session_id import MigrationSessionId
from ..domain.repositories.migration_session_repository import MigrationSessionRepository

class InMemoryMigrationSessionRepository(MigrationSessionRepository):
    def __init__(self):
        self._sessions: Dict[str, MigrationSession] = {}
        self._user_sessions: Dict[str, str] = {}
    
    def save(self, session: MigrationSession) -> None:
        self._sessions[session.session_id.value] = session
        self._user_sessions[session.user_id] = session.session_id.value
    
    def find_by_id(self, session_id: MigrationSessionId) -> Optional[MigrationSession]:
        return self._sessions.get(session_id.value)
    
    def find_by_user(self, user_id: str) -> Optional[MigrationSession]:
        session_id = self._user_sessions.get(user_id)
        return self._sessions.get(session_id) if session_id else None