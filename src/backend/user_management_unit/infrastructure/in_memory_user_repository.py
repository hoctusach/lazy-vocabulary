from typing import Dict, Optional
from ..domain.entities.user import User
from ..domain.value_objects.user_id import UserId
from ..domain.value_objects.email import Email
from ..domain.repositories.user_repository import UserRepository

class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self._users: Dict[str, User] = {}
        self._email_index: Dict[str, str] = {}
    
    def save(self, user: User) -> None:
        self._users[user.user_id.value] = user
        self._email_index[user.email.value] = user.user_id.value
    
    def find_by_id(self, user_id: UserId) -> Optional[User]:
        return self._users.get(user_id.value)
    
    def find_by_email(self, email: Email) -> Optional[User]:
        user_id = self._email_index.get(email.value)
        return self._users.get(user_id) if user_id else None
    
    def exists_by_email(self, email: Email) -> bool:
        return email.value in self._email_index