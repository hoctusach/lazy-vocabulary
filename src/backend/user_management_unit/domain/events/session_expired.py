from dataclasses import dataclass
from datetime import datetime
from ..value_objects.user_id import UserId
from ..value_objects.session_id import SessionId

@dataclass
class SessionExpired:
    user_id: UserId
    session_id: SessionId
    occurred_at: datetime