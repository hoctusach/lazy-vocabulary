from datetime import datetime
from typing import List
from ..entities.migration_session import MigrationSession
from ..entities.local_data_snapshot import LocalDataSnapshot
from ..value_objects.migration_session_id import MigrationSessionId
from ..value_objects.migration_status import MigrationStatus, Status
from ..value_objects.migration_result import MigrationResult
from ..value_objects.local_progress_data import LocalProgressData
from ..repositories.migration_session_repository import MigrationSessionRepository

class MigrationOrchestrationService:
    def __init__(self, session_repo: MigrationSessionRepository):
        self.session_repo = session_repo
    
    def start_migration(self, user_id: str, snapshot: LocalDataSnapshot) -> MigrationSession:
        existing_session = self.session_repo.find_by_user(user_id)
        if existing_session and existing_session.status.status in [Status.PENDING, Status.IN_PROGRESS]:
            raise ValueError("Migration already in progress for this user")
        
        session = MigrationSession(
            session_id=MigrationSessionId.generate(),
            user_id=user_id,
            status=MigrationStatus(Status.PENDING, 0.0, "Starting migration"),
            local_data=snapshot.progress_data,
            started_at=datetime.now()
        )
        
        self.session_repo.save(session)
        return session
    
    def process_migration(self, session: MigrationSession) -> MigrationSession:
        # Simulate migration processing
        total_items = len(session.local_data)
        migrated_items = 0
        errors = []
        
        for item in session.local_data:
            if item.validate():
                migrated_items += 1
            else:
                errors.append(f"Invalid data for word {item.word_id}")
        
        result = MigrationResult(
            total_items=total_items,
            migrated_items=migrated_items,
            skipped_items=total_items - migrated_items,
            conflict_count=0,
            errors=errors,
            summary=f"Migrated {migrated_items}/{total_items} items"
        )
        
        session.status = MigrationStatus(Status.COMPLETED, 1.0, "Migration completed")
        session.completed_at = datetime.now()
        session.result = result
        
        self.session_repo.save(session)
        return session