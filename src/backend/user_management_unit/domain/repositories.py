"""Repository interfaces for User Management."""
from abc import ABC, abstractmethod
from typing import List, Optional

from domain.entities import User, UserSession
from domain.value_objects import UserId, SessionId, Email


class UserRepository(ABC):
    @abstractmethod
    def find_by_email(self, email: Email) -> Optional[User]:
        pass
    
    @abstractmethod
    def find_by_id(self, user_id: UserId) -> Optional[User]:
        pass
    
    @abstractmethod
    def save(self, user: User) -> None:
        pass
    
    @abstractmethod
    def exists_by_email(self, email: Email) -> bool:
        pass


class SessionRepository(ABC):
    @abstractmethod
    def find_by_session_id(self, session_id: SessionId) -> Optional[UserSession]:
        pass
    
    @abstractmethod
    def find_active_by_user_id(self, user_id: UserId) -> List[UserSession]:
        pass
    
    @abstractmethod
    def save(self, session: UserSession) -> None:
        pass
    
    @abstractmethod
    def delete_expired(self) -> None:
        pass