from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from ..value_objects.migration_session_id import MigrationSessionId
from ..value_objects.migration_status import MigrationStatus
from ..value_objects.migration_result import MigrationResult
from ..value_objects.local_progress_data import LocalProgressData

@dataclass
class MigrationSession:
    session_id: MigrationSessionId
    user_id: str
    status: MigrationStatus
    local_data: List[LocalProgressData]
    started_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[MigrationResult] = None