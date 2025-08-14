from dataclasses import dataclass
from typing import Dict, Any, Optional

@dataclass
class DetectMigrationRequest:
    user_id: str
    local_data: Dict[str, Any]

@dataclass
class DetectMigrationResponse:
    has_local_data: bool
    item_count: int
    data_version: str
    can_migrate: bool

@dataclass
class StartMigrationRequest:
    user_id: str
    local_data: Dict[str, Any]

@dataclass
class StartMigrationResponse:
    session_id: str
    status: str
    progress: float

@dataclass
class GetMigrationStatusRequest:
    user_id: str

@dataclass
class GetMigrationStatusResponse:
    session_id: Optional[str]
    status: Optional[str]
    progress: Optional[float]
    current_step: Optional[str]
    result: Optional[Dict[str, Any]]