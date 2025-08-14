"""Value objects for User Management domain."""
import re
import uuid
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Email:
    value: str
    
    def __post_init__(self):
        if not self.validate():
            raise ValueError(f"Invalid email format: {self.value}")
    
    def validate(self) -> bool:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, self.value))


@dataclass(frozen=True)
class Nickname:
    value: str
    
    def __post_init__(self):
        if not self.validate():
            raise ValueError(f"Invalid nickname: {self.value}")
    
    def validate(self) -> bool:
        return 3 <= len(self.value.strip()) <= 50


@dataclass(frozen=True)
class DeviceInfo:
    device_type: str
    user_agent: str
    ip_address: str


@dataclass(frozen=True)
class UserId:
    value: str
    
    def __post_init__(self):
        try:
            uuid.UUID(self.value)
        except ValueError:
            raise ValueError(f"Invalid UUID format: {self.value}")
    
    @classmethod
    def generate(cls) -> 'UserId':
        return cls(str(uuid.uuid4()))


@dataclass(frozen=True)
class SessionId:
    value: str
    
    def __post_init__(self):
        try:
            uuid.UUID(self.value)
        except ValueError:
            raise ValueError(f"Invalid UUID format: {self.value}")
    
    @classmethod
    def generate(cls) -> 'SessionId':
        return cls(str(uuid.uuid4()))