"""Domain entities for User Management."""
from datetime import datetime
from dataclasses import dataclass
from typing import List, Optional

from domain.value_objects import UserId, SessionId, Email, Nickname, DeviceInfo


@dataclass
class User:
    """User aggregate root."""
    user_id: UserId
    email: Email
    nickname: Nickname
    created_at: datetime
    last_login_at: Optional[datetime] = None
    is_active: bool = True
    
    def update_last_login(self) -> None:
        self.last_login_at = datetime.utcnow()
    
    def deactivate(self) -> None:
        self.is_active = False


@dataclass
class UserSession:
    """User session entity."""
    session_id: SessionId
    user_id: UserId
    device_info: DeviceInfo
    created_at: datetime
    last_accessed_at: datetime
    is_active: bool = True
    
    def update_access_time(self) -> None:
        self.last_accessed_at = datetime.utcnow()
    
    def invalidate(self) -> None:
        self.is_active = False