from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from ..value_objects.user_id import UserId
from ..value_objects.email import Email
from ..value_objects.nickname import Nickname

@dataclass
class User:
    user_id: UserId
    email: Email
    nickname: Nickname
    created_at: datetime
    last_login_at: Optional[datetime] = None
    is_active: bool = True