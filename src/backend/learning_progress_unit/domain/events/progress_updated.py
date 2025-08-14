from dataclasses import dataclass
from datetime import datetime
from ..value_objects.user_id import UserId
from ..value_objects.progress_id import ProgressId
from ..value_objects.srs_data import SRSData

@dataclass
class ProgressUpdated:
    progress_id: ProgressId
    user_id: UserId
    word_id: str
    previous_srs_data: SRSData
    new_srs_data: SRSData
    occurred_at: datetime