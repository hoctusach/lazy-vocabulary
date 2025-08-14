from abc import ABC, abstractmethod
from typing import Optional
from ..entities.user import User
from ..value_objects.user_id import UserId
from ..value_objects.email import Email

class UserRepository(ABC):
    @abstractmethod
    def save(self, user: User) -> None:
        pass
    
    @abstractmethod
    def find_by_id(self, user_id: UserId) -> Optional[User]:
        pass
    
    @abstractmethod
    def find_by_email(self, email: Email) -> Optional[User]:
        pass
    
    @abstractmethod
    def exists_by_email(self, email: Email) -> bool:
        pass