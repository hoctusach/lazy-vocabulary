"""
Unified value objects for the Lazy Vocabulary backend service.
Consolidates value objects from all five original units.
"""
from dataclasses import dataclass
from typing import Dict, Any
import re
import uuid


@dataclass(frozen=True)
class UserId:
    """User identifier value object."""
    value: str
    
    def __post_init__(self):
        if not self.value or not isinstance(self.value, str):
            raise ValueError("UserId must be a non-empty string")


@dataclass(frozen=True)
class SessionId:
    """Session identifier value object."""
    value: str
    
    def __post_init__(self):
        if not self.value or not isinstance(self.value, str):
            raise ValueError("SessionId must be a non-empty string")


@dataclass(frozen=True)
class Email:
    """Email value object with validation."""
    value: str
    
    def __post_init__(self):
        if not self._is_valid_email(self.value):
            raise ValueError(f"Invalid email format: {self.value}")
    
    def _is_valid_email(self, email: str) -> bool:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))


@dataclass(frozen=True)
class Nickname:
    """Nickname value object with validation."""
    value: str
    
    def __post_init__(self):
        if not self.value or len(self.value.strip()) < 2:
            raise ValueError("Nickname must be at least 2 characters long")
        if len(self.value) > 50:
            raise ValueError("Nickname must be 50 characters or less")


@dataclass(frozen=True)
class WordId:
    """Word identifier value object."""
    value: str
    
    def __post_init__(self):
        if not self.value or not isinstance(self.value, str):
            raise ValueError("WordId must be a non-empty string")


@dataclass(frozen=True)
class WordText:
    """Word text value object with validation."""
    value: str
    
    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise ValueError("Word text cannot be empty")
        if len(self.value) > 200:
            raise ValueError("Word text must be 200 characters or less")


@dataclass(frozen=True)
class Meaning:
    """Meaning value object with validation."""
    value: str
    
    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise ValueError("Meaning cannot be empty")


@dataclass(frozen=True)
class CategoryId:
    """Category identifier value object."""
    value: str
    
    def __post_init__(self):
        if not self.value or not isinstance(self.value, str):
            raise ValueError("CategoryId must be a non-empty string")


@dataclass(frozen=True)
class CategoryName:
    """Category name value object with validation."""
    value: str
    
    def __post_init__(self):
        if not self.value or not self.value.strip():
            raise ValueError("Category name cannot be empty")
        if len(self.value) > 100:
            raise ValueError("Category name must be 100 characters or less")


@dataclass(frozen=True)
class ProgressId:
    """Progress identifier value object."""
    value: str
    
    def __post_init__(self):
        if not self.value or not isinstance(self.value, str):
            raise ValueError("ProgressId must be a non-empty string")


@dataclass(frozen=True)
class SRSData:
    """Spaced Repetition System data value object."""
    interval_days: int
    ease_factor: float
    repetitions: int
    
    def __post_init__(self):
        if self.interval_days < 1:
            raise ValueError("Interval days must be at least 1")
        if self.ease_factor < 1.3:
            raise ValueError("Ease factor must be at least 1.3")
        if self.repetitions < 0:
            raise ValueError("Repetitions cannot be negative")


@dataclass(frozen=True)
class DeviceInfo:
    """Device information value object."""
    device_type: str
    user_agent: str = ""
    
    def __post_init__(self):
        if not self.device_type or not self.device_type.strip():
            raise ValueError("Device type cannot be empty")


@dataclass(frozen=True)
class MigrationSessionId:
    """Migration session identifier value object."""
    value: str
    
    def __post_init__(self):
        if not self.value or not isinstance(self.value, str):
            raise ValueError("MigrationSessionId must be a non-empty string")


@dataclass(frozen=True)
class LocalProgressData:
    """Local progress data value object."""
    data: Dict[str, Any]
    
    def __post_init__(self):
        if not isinstance(self.data, dict):
            raise ValueError("Local progress data must be a dictionary")


def generate_id() -> str:
    """Generate a unique identifier."""
    return str(uuid.uuid4())