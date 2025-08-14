from abc import ABC, abstractmethod
from typing import Optional
from ..entities.local_data_snapshot import LocalDataSnapshot

class LocalDataSnapshotRepository(ABC):
    @abstractmethod
    def save(self, snapshot: LocalDataSnapshot) -> None:
        pass
    
    @abstractmethod
    def find_by_user(self, user_id: str) -> Optional[LocalDataSnapshot]:
        pass