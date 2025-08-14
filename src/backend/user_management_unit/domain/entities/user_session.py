from dataclasses import dataclass
from datetime import datetime
from ..value_objects.user_id import UserId
from ..value_objects.session_id import SessionId
from ..value_objects.device_info import DeviceInfo

@dataclass
class UserSession:
    session_id: SessionId
    user_id: UserId
    device_info: DeviceInfo
    created_at: datetime
    last_accessed_at: datetime
    is_active: bool = True