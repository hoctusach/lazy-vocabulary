from dataclasses import dataclass
from datetime import datetime

@dataclass
class LocalDataDetected:
    user_id: str
    data_version: str
    item_count: int
    detected_at: datetime