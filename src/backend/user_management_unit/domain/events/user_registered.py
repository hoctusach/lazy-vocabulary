from dataclasses import dataclass
from datetime import datetime
from ..value_objects.user_id import UserId
from ..value_objects.email import Email
from ..value_objects.nickname import Nickname

@dataclass
class UserRegistered:
    user_id: UserId
    email: Email
    nickname: Nickname
    occurred_at: datetime