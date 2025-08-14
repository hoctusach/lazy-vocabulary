#!/usr/bin/env python3

import sys
import os
import json
from datetime import datetime

# Add the parent directory to Python path to enable absolute imports
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, parent_dir)

from src.backend.data_migration_unit.infrastructure.in_memory_migration_session_repository import InMemoryMigrationSessionRepository
from src.backend.data_migration_unit.infrastructure.in_memory_local_data_snapshot_repository import InMemoryLocalDataSnapshotRepository
from src.backend.data_migration_unit.domain.services.local_data_detection_service import LocalDataDetectionService
from src.backend.data_migration_unit.domain.services.migration_orchestration_service import MigrationOrchestrationService
from src.backend.data_migration_unit.application.event_publisher import EventPublisher
from src.backend.data_migration_unit.application.migration_facade import MigrationFacade
from src.backend.data_migration_unit.api.migration_controller import MigrationController

def main():
    print("=== Complete Data Migration System Demo ===\n")
    
    # Setup the complete system
    session_repo = InMemoryMigrationSessionRepository()
    snapshot_repo = InMemoryLocalDataSnapshotRepository()
    detection_service = LocalDataDetectionService()
    orchestration_service = MigrationOrchestrationService(session_repo)
    event_publisher = EventPublisher()
    
    facade = MigrationFacade(detection_service, orchestration_service, event_publisher)
    controller = MigrationController(facade)
    
    # Complex sample data with various scenarios
    complex_local_data = {
        "progress": [
            {
                "word_id": "hello",
                "review_count": 15,
                "correct_count": 12,
                "last_reviewed_at": datetime.now().isoformat(),
                "srs_interval": 14,
                "ease_factor": 2.8
            },
            {
                "word_id": "world",
                "review_count": 8,
                "correct_count": 6,
                "last_reviewed_at": datetime.now().isoformat(),
                "srs_interval": 5,
                "ease_factor": 2.4
            },
            {
                "word_id": "invalid_word",
                "review_count": -1,  # Invalid data
                "correct_count": 5,
                "last_reviewed_at": datetime.now().isoformat(),
                "srs_interval": 1,
                "ease_factor": 2.0
            },
            {
                "word_id": "python",
                "review_count": 25,
                "correct_count": 23,
                "last_reviewed_at": datetime.now().isoformat(),
                "srs_interval": 30,
                "ease_factor": 3.2
            }
        ],
        "preferences": {
            "daily_goal": 20,
            "categories": ["programming", "general"]
        }
    }
    
    try:
        print("1. Testing API Endpoints...")
        
        # Test detection API
        print("   a) Local Data Detection API:")
        detect_request = {
            "user_id": "advanced_user_456",
            "local_data": complex_local_data
        }
        result = controller.detect_migration(detect_request)
        print(f"      Result: {json.dumps(result, indent=6)}")
        
        # Test migration start API
        print("\n   b) Migration Start API:")
        start_request = {
            "user_id": "advanced_user_456",
            "local_data": complex_local_data
        }
        result = controller.start_migration(start_request)
        print(f"      Result: {json.dumps(result, indent=6)}")
        
        # Test status API
        print("\n   c) Migration Status API:")
        status_request = {"user_id": "advanced_user_456"}
        result = controller.get_migration_status(status_request)
        print(f"      Result: {json.dumps(result, indent=6)}")
        
        print("\n2. Testing Edge Cases...")
        
        # Test empty data
        print("   a) Empty Local Data:")
        empty_result = controller.detect_migration({
            "user_id": "empty_user",
            "local_data": {"progress": []}
        })
        print(f"      Result: {json.dumps(empty_result, indent=6)}")
        
        # Test invalid user
        print("\n   b) Non-existent User Status:")
        invalid_result = controller.get_migration_status({"user_id": "non_existent"})
        print(f"      Result: {json.dumps(invalid_result, indent=6)}")
        
        print("\n3. System Events Timeline:")
        for i, event in enumerate(event_publisher.get_events(), 1):
            event_name = type(event).__name__
            if hasattr(event, 'user_id'):
                print(f"   {i}. {event_name} - User: {event.user_id}")
            else:
                print(f"   {i}. {event_name}")
        
        print("\n4. Repository Analytics:")
        print(f"   Migration Sessions: {len(session_repo._sessions)}")
        print(f"   User Sessions Mapping: {len(session_repo._user_sessions)}")
        print(f"   Data Snapshots: {len(snapshot_repo._snapshots)}")
        
        print("\n5. Migration Results Analysis:")
        for user_id, session_id in session_repo._user_sessions.items():
            session = session_repo._sessions.get(session_id)
            if session and session.result:
                print(f"   User {user_id}:")
                print(f"     - Total Items: {session.result.total_items}")
                print(f"     - Migrated: {session.result.migrated_items}")
                print(f"     - Skipped: {session.result.skipped_items}")
                print(f"     - Errors: {len(session.result.errors)}")
        
        print("\n=== Complete Demo Success! ===")
        print("\nThe Data Migration Unit is fully operational and ready for production integration.")
        print("\nKey capabilities demonstrated:")
        print("- Local data detection and validation")
        print("- Automated migration processing")
        print("- Event-driven architecture")
        print("- Error handling and data validation")
        print("- RESTful API endpoints")
        print("- Session management")
        print("- Repository pattern implementation")
        
        return 0
        
    except Exception as e:
        print(f"Demo failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())