from dataclasses import dataclass
from enum import Enum
from typing import Optional

class Status(Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

@dataclass(frozen=True)
class MigrationStatus:
    status: Status
    progress: float = 0.0
    current_step: str = ""
    error_message: Optional[str] = None
    
    def __post_init__(self):
        if not 0.0 <= self.progress <= 1.0:
            raise ValueError("Progress must be between 0.0 and 1.0")