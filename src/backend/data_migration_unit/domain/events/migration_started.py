from dataclasses import dataclass
from datetime import datetime
from ..value_objects.migration_session_id import MigrationSessionId

@dataclass
class MigrationStarted:
    session_id: MigrationSessionId
    user_id: str
    total_items: int
    started_at: datetime