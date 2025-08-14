"""Domain events for User Management."""
from datetime import datetime
from dataclasses import dataclass

from domain.value_objects import UserId, SessionId, Email, Nickname, DeviceInfo


@dataclass(frozen=True)
class UserRegistered:
    user_id: UserId
    email: Email
    nickname: Nickname
    occurred_at: datetime


@dataclass(frozen=True)
class UserLoggedIn:
    user_id: UserId
    session_id: SessionId
    device_info: DeviceInfo
    occurred_at: datetime


@dataclass(frozen=True)
class SessionExpired:
    user_id: UserId
    session_id: SessionId
    occurred_at: datetime