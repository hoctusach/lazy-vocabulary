from abc import ABC, abstractmethod
from typing import Optional
from ..entities.migration_session import MigrationSession
from ..value_objects.migration_session_id import MigrationSessionId

class MigrationSessionRepository(ABC):
    @abstractmethod
    def save(self, session: MigrationSession) -> None:
        pass
    
    @abstractmethod
    def find_by_id(self, session_id: MigrationSessionId) -> Optional[MigrationSession]:
        pass
    
    @abstractmethod
    def find_by_user(self, user_id: str) -> Optional[MigrationSession]:
        pass