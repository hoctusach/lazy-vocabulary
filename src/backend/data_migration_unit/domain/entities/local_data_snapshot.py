from dataclasses import dataclass
from datetime import datetime
from typing import List
from ..value_objects.local_progress_data import LocalProgressData

@dataclass
class LocalDataSnapshot:
    snapshot_id: str
    user_id: str
    progress_data: List[LocalProgressData]
    created_at: datetime
    data_version: str
    checksum: str