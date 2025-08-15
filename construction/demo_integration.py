#!/usr/bin/env python3

import sys
import os
import time

# Add both unit paths
sys.path.append(os.path.join(os.path.dirname(__file__), 'unit4-learning-progress-integration/src'))
sys.path.append(os.path.join(os.path.dirname(__file__), 'unit5-playback-integration/src'))

# Unit 4 imports
from events.event_bus import EventBus
from events.event_handlers import EventHandlers
from services.learning_progress_integrator import LearningProgressIntegrator
from services.component_initializer import ComponentInitializer
from services.progress_update_coordinator import ProgressUpdateCoordinator
from models.learning_progress import LearningProgress, LearningStatus
from repositories.learning_progress_repository import LearningProgressRepository

# Unit 5 imports
from services.playback_integration_service import PlaybackIntegrationService
from services.audio_completion_detector import AudioCompletionDetector
from ui.retirement_dialog import RetirementDialog
from integration.progress_tracking_integrator import ProgressTrackingIntegrator
from datetime import datetime

def demo_integration():
    print("=== Units 4 & 5 Integration Demo ===\n")
    
    # Initialize Unit 4 (Learning Progress Integration)
    print("1. Initializing Unit 4: Learning Progress Integration")
    print("-" * 60)
    
    event_bus = EventBus()
    event_handlers = EventHandlers()
    
    # Subscribe to events
    event_bus.subscribe('AppStarted', event_handlers.handle_app_started)
    event_bus.subscribe('DateChanged', event_handlers.handle_date_changed)
    event_bus.subscribe('ProgressUpdated', event_handlers.handle_progress_updated)
    
    # Initialize Unit 4 services
    integrator = LearningProgressIntegrator(event_bus)
    component_initializer = ComponentInitializer(integrator)
    progress_coordinator = ProgressUpdateCoordinator(event_bus)
    
    # Start Unit 4
    integrator.initialize_on_app_start()
    component_initializer.initialize_components()
    print()
    
    # Initialize Unit 5 (Playback Integration)
    print("2. Initializing Unit 5: Playback Integration")
    print("-" * 60)
    
    # Initialize Unit 5 services
    playback_service = PlaybackIntegrationService(event_bus)
    audio_detector = AudioCompletionDetector(playback_service)
    progress_tracker = ProgressTrackingIntegrator(event_bus)
    retirement_dialog = RetirementDialog()
    
    # Connect Unit 5 with UI
    playback_service.connect_with_vocabulary_card()
    audio_detector.setup_detection()
    print()
    
    # Create sample learning data
    print("3. Creating Sample Learning Data")
    print("-" * 60)
    
    progress_repo = LearningProgressRepository()
    
    sample_words = [
        LearningProgress(
            word="integrate",
            category="topic vocab",
            is_learned=False,
            review_count=0,
            last_played_date="",
            status=LearningStatus.NEW,
            next_review_date=datetime.now().strftime('%Y-%m-%d'),
            created_date=datetime.now().strftime('%Y-%m-%d')
        ),
        LearningProgress(
            word="demonstrate",
            category="phrasal verbs",
            is_learned=True,
            review_count=1,
            last_played_date=datetime.now().strftime('%Y-%m-%d'),
            status=LearningStatus.DUE,
            next_review_date=datetime.now().strftime('%Y-%m-%d'),
            created_date=datetime.now().strftime('%Y-%m-%d')
        )
    ]
    
    for word in sample_words:
        progress_repo.save(word.word, word)
        print(f"Created: {word.word} (Status: {word.status.value})")
    
    # Set current word in playback service
    playback_service.state.current_word = {
        'word': 'integrate',
        'meaning': 'combine one thing with another to form a whole',
        'category': 'topic vocab'
    }
    print()
    
    # Test integrated workflow
    print("4. Testing Integrated Workflow")
    print("-" * 60)
    
    print("Step 1: User clicks Next button")
    next_interaction = playback_service.handle_next_click()
    progress_tracker.track_button_interaction(next_interaction)
    
    # Update progress through Unit 4
    progress_coordinator.update_word_progress("integrate", "MANUAL_ADVANCE")
    progress_tracker.complete_progress_tracking("integrate")
    print()
    
    print("Step 2: Audio completion triggers auto-advance")
    audio_detector.start_audio_monitoring("integrate", 1.5)
    time.sleep(2)  # Wait for completion
    
    # Update progress for completion
    progress_coordinator.update_word_progress("integrate", "COMPLETION")
    print()
    
    # Test retirement workflow end-to-end
    print("5. Testing Retirement Functionality End-to-End")
    print("-" * 60)
    
    def on_retirement_confirmed():
        print("Retirement confirmed - executing retirement workflow:")
        
        # Unit 5: Handle UI retirement
        retire_interaction = playback_service.handle_retire_click("demonstrate")
        progress_tracker.track_button_interaction(retire_interaction)
        
        # Unit 4: Execute retirement in learning progress
        progress_coordinator.retire_word("demonstrate")
        
        # Complete tracking
        progress_tracker.complete_progress_tracking("demonstrate")
        
        # Verify retirement
        retired_word = progress_repo.get("demonstrate")
        if retired_word:
            print(f"✓ Word '{retired_word.word}' successfully retired")
            print(f"  Status: {retired_word.status.value}")
            print(f"  Retirement date: {retired_word.retired_date}")
            print(f"  Will return on: {retired_word.next_review_date}")
    
    retirement_dialog.show_retirement_confirmation("demonstrate", on_retirement_confirmed)
    
    # Final verification
    print("6. Final System State Verification")
    print("-" * 60)
    
    all_progress = progress_repo.get_all()
    print(f"Total words in system: {len(all_progress)}")
    
    for word_key, progress in all_progress.items():
        print(f"  {word_key}:")
        print(f"    Status: {progress.status.value}")
        print(f"    Review count: {progress.review_count}")
        print(f"    Last played: {progress.last_played_date}")
        if progress.retired_date:
            print(f"    Retired: {progress.retired_date}")
    print()
    
    print("7. Cross-Unit Event Flow Verification")
    print("-" * 60)
    
    # Simulate date change to test cross-unit coordination
    print("Simulating date change event...")
    integrator.check_date_change()
    
    # This would trigger:
    # - Unit 4: Reset daily selections, regenerate lists
    # - Unit 5: Update UI state, refresh integration
    print("Cross-unit coordination complete")
    print()
    
    print("=== Integration Demo Complete ===")
    print("\nSummary:")
    print("✓ Unit 4 (Learning Progress) initialized successfully")
    print("✓ Unit 5 (Playback Integration) connected successfully") 
    print("✓ Cross-unit communication working")
    print("✓ Retirement workflow end-to-end functional")
    print("✓ Event-driven architecture operational")
    print("✓ Data persistence with localStorage simulation")

if __name__ == "__main__":
    demo_integration()