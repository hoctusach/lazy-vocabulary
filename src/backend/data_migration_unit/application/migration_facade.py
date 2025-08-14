from datetime import datetime
from typing import Dict, Any, Optional
from ..domain.services.local_data_detection_service import LocalDataDetectionService
from ..domain.services.migration_orchestration_service import MigrationOrchestrationService
from ..domain.events.local_data_detected import LocalDataDetected
from ..domain.events.migration_started import MigrationStarted
from ..domain.events.migration_completed import MigrationCompleted
from .event_publisher import EventPublisher

class MigrationFacade:
    def __init__(self, detection_service: LocalDataDetectionService,
                 orchestration_service: MigrationOrchestrationService,
                 event_publisher: EventPublisher):
        self.detection_service = detection_service
        self.orchestration_service = orchestration_service
        self.event_publisher = event_publisher
    
    def detect_local_data(self, user_id: str, local_data: Dict[str, Any]) -> Dict[str, Any]:
        snapshot = self.detection_service.detect_local_data(user_id, local_data)
        
        event = LocalDataDetected(
            user_id=user_id,
            data_version=snapshot.data_version,
            item_count=len(snapshot.progress_data),
            detected_at=datetime.now()
        )
        self.event_publisher.publish(event)
        
        return {
            "has_local_data": len(snapshot.progress_data) > 0,
            "item_count": len(snapshot.progress_data),
            "data_version": snapshot.data_version,
            "can_migrate": True
        }
    
    def start_migration(self, user_id: str, local_data: Dict[str, Any]) -> Dict[str, Any]:
        snapshot = self.detection_service.detect_local_data(user_id, local_data)
        session = self.orchestration_service.start_migration(user_id, snapshot)
        
        event = MigrationStarted(
            session_id=session.session_id,
            user_id=user_id,
            total_items=len(snapshot.progress_data),
            started_at=datetime.now()
        )
        self.event_publisher.publish(event)
        
        # Process migration immediately for demo
        completed_session = self.orchestration_service.process_migration(session)
        
        if completed_session.result:
            completion_event = MigrationCompleted(
                session_id=completed_session.session_id,
                user_id=user_id,
                result=completed_session.result,
                completed_at=completed_session.completed_at or datetime.now()
            )
            self.event_publisher.publish(completion_event)
        
        return {
            "session_id": session.session_id.value,
            "status": session.status.status.value,
            "progress": session.status.progress
        }
    
    def get_migration_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        session = self.orchestration_service.session_repo.find_by_user(user_id)
        if not session:
            return None
        
        return {
            "session_id": session.session_id.value,
            "status": session.status.status.value,
            "progress": session.status.progress,
            "current_step": session.status.current_step,
            "result": session.result.__dict__ if session.result else None
        }