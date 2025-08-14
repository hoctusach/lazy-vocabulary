from typing import Dict, Optional
from ..domain.entities.local_data_snapshot import LocalDataSnapshot
from ..domain.repositories.local_data_snapshot_repository import LocalDataSnapshotRepository

class InMemoryLocalDataSnapshotRepository(LocalDataSnapshotRepository):
    def __init__(self):
        self._snapshots: Dict[str, LocalDataSnapshot] = {}
        self._user_snapshots: Dict[str, str] = {}
    
    def save(self, snapshot: LocalDataSnapshot) -> None:
        self._snapshots[snapshot.snapshot_id] = snapshot
        self._user_snapshots[snapshot.user_id] = snapshot.snapshot_id
    
    def find_by_user(self, user_id: str) -> Optional[LocalDataSnapshot]:
        snapshot_id = self._user_snapshots.get(user_id)
        return self._snapshots.get(snapshot_id) if snapshot_id else None