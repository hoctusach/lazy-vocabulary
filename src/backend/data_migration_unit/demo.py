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
    print("=== Data Migration Unit Demo ===\n")
    
    # Setup dependencies
    session_repo = InMemoryMigrationSessionRepository()
    snapshot_repo = InMemoryLocalDataSnapshotRepository()
    detection_service = LocalDataDetectionService()
    orchestration_service = MigrationOrchestrationService(session_repo)
    event_publisher = EventPublisher()
    
    facade = MigrationFacade(detection_service, orchestration_service, event_publisher)
    controller = MigrationController(facade)
    
    # Sample local data
    sample_local_data = {
        "progress": [
            {
                "word_id": "word_1",
                "review_count": 5,
                "correct_count": 4,
                "last_reviewed_at": datetime.now().isoformat(),
                "srs_interval": 3,
                "ease_factor": 2.5
            },
            {
                "word_id": "word_2",
                "review_count": 10,
                "correct_count": 8,
                "last_reviewed_at": datetime.now().isoformat(),
                "srs_interval": 7,
                "ease_factor": 2.8
            },
            {
                "word_id": "word_3",
                "review_count": 2,
                "correct_count": 1,
                "last_reviewed_at": datetime.now().isoformat(),
                "srs_interval": 1,
                "ease_factor": 2.2
            }
        ]
    }
    
    try:
        # Test local data detection
        print("1. Testing Local Data Detection...")
        detect_request = {
            "user_id": "test_user_123",
            "local_data": sample_local_data
        }
        result = controller.detect_migration(detect_request)
        print(f"   Detection result: {json.dumps(result, indent=2)}")
        
        # Test migration start
        print("\n2. Starting Migration...")
        start_request = {
            "user_id": "test_user_123",
            "local_data": sample_local_data
        }
        result = controller.start_migration(start_request)
        print(f"   Migration start result: {json.dumps(result, indent=2)}")
        
        # Test migration status
        print("\n3. Checking Migration Status...")
        status_request = {"user_id": "test_user_123"}
        result = controller.get_migration_status(status_request)
        print(f"   Migration status: {json.dumps(result, indent=2)}")
        
        # Test error handling - duplicate migration
        print("\n4. Testing Duplicate Migration...")
        duplicate_result = controller.start_migration(start_request)
        print(f"   Duplicate migration result: {json.dumps(duplicate_result, indent=2)}")
        
        # Show published events
        print("\n5. Published Events:")
        for i, event in enumerate(event_publisher.get_events(), 1):
            print(f"   {i}. {type(event).__name__}")
        
        # Show repository state
        print("\n6. Repository State:")
        print(f"   Sessions in repository: {len(session_repo._sessions)}")
        print(f"   Snapshots in repository: {len(snapshot_repo._snapshots)}")
        
        print("\n=== Demo completed successfully! ===")
        print("\nThe Data Migration Unit is ready for integration.")
        print("Key features implemented:")
        print("- Local data detection and validation")
        print("- Migration session management")
        print("- Event-driven architecture")
        print("- In-memory repositories for demo")
        print("- RESTful API layer")
        
        return 0
        
    except Exception as e:
        print(f"Demo failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())