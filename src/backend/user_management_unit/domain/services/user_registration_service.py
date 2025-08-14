from datetime import datetime
from ..entities.user import User
from ..value_objects.user_id import UserId
from ..value_objects.email import Email
from ..value_objects.nickname import Nickname
from ..repositories.user_repository import UserRepository

class UserRegistrationService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
    
    def register_user(self, email: Email, nickname: Nickname, password: str) -> User:
        if self.user_repo.exists_by_email(email):
            raise ValueError(f"User with email {email} already exists")
        
        user = User(
            user_id=UserId.generate(),
            email=email,
            nickname=nickname,
            created_at=datetime.now()
        )
        
        self.user_repo.save(user)
        return user