from datetime import datetime
from typing import List, Dict, Any
import hashlib
import json
from ..entities.local_data_snapshot import LocalDataSnapshot
from ..value_objects.local_progress_data import LocalProgressData

class LocalDataDetectionService:
    def detect_local_data(self, user_id: str, local_data: Dict[str, Any]) -> LocalDataSnapshot:
        progress_data = self._parse_progress_data(local_data.get("progress", []))
        data_json = json.dumps(local_data, sort_keys=True)
        checksum = hashlib.md5(data_json.encode()).hexdigest()
        
        return LocalDataSnapshot(
            snapshot_id=f"snapshot_{user_id}_{int(datetime.now().timestamp())}",
            user_id=user_id,
            progress_data=progress_data,
            created_at=datetime.now(),
            data_version="1.0",
            checksum=checksum
        )
    
    def _parse_progress_data(self, raw_data: List[Dict[str, Any]]) -> List[LocalProgressData]:
        result = []
        for item in raw_data:
            try:
                progress = LocalProgressData(
                    word_id=item.get("word_id", ""),
                    review_count=item.get("review_count", 0),
                    correct_count=item.get("correct_count", 0),
                    last_reviewed_at=datetime.fromisoformat(item.get("last_reviewed_at", datetime.now().isoformat())),
                    srs_interval=item.get("srs_interval", 1),
                    ease_factor=item.get("ease_factor", 2.5)
                )
                if progress.validate():
                    result.append(progress)
            except (ValueError, TypeError):
                continue
        return result