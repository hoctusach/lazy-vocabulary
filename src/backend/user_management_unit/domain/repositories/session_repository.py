from abc import ABC, abstractmethod
from typing import Optional, List
from ..entities.user_session import UserSession
from ..value_objects.user_id import UserId
from ..value_objects.session_id import SessionId

class SessionRepository(ABC):
    @abstractmethod
    def save(self, session: UserSession) -> None:
        pass
    
    @abstractmethod
    def find_by_session_id(self, session_id: SessionId) -> Optional[UserSession]:
        pass
    
    @abstractmethod
    def find_active_by_user_id(self, user_id: UserId) -> List[UserSession]:
        pass
    
    @abstractmethod
    def delete_expired(self) -> None:
        pass