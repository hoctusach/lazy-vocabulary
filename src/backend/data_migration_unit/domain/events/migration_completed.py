from dataclasses import dataclass
from datetime import datetime
from ..value_objects.migration_session_id import MigrationSessionId
from ..value_objects.migration_result import MigrationResult

@dataclass
class MigrationCompleted:
    session_id: MigrationSessionId
    user_id: str
    result: MigrationResult
    completed_at: datetime