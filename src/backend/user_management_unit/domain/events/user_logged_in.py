from dataclasses import dataclass
from datetime import datetime
from ..value_objects.user_id import UserId
from ..value_objects.session_id import SessionId
from ..value_objects.device_info import DeviceInfo

@dataclass
class UserLoggedIn:
    user_id: UserId
    session_id: SessionId
    device_info: DeviceInfo
    occurred_at: datetime