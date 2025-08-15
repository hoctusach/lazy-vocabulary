#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(__file__))

from models.ui_integration_state import UIIntegrationState, ButtonType
from services.playback_integration_service import PlaybackIntegrationService
from services.audio_completion_detector import AudioCompletionDetector
from integration.existing_handler_enhancer import ExistingHandlerEnhancer
from integration.progress_tracking_integrator import ProgressTrackingIntegrator
from ui.ui_preservation_layer import UIPreservationLayer
from ui.graceful_degradation import GracefulDegradation
from ui.retirement_dialog import RetirementDialog
import time

class MockEventBus:
    def publish(self, event):
        print(f"Event published: {event}")

def demo_unit5():
    print("=== Unit 5: Playback Integration Demo ===\n")
    
    # Initialize services
    event_bus = MockEventBus()
    integration_service = PlaybackIntegrationService(event_bus)
    audio_detector = AudioCompletionDetector(integration_service)
    handler_enhancer = ExistingHandlerEnhancer(integration_service)
    progress_tracker = ProgressTrackingIntegrator(event_bus)
    ui_preservation = UIPreservationLayer()
    graceful_degradation = GracefulDegradation(handler_enhancer)
    retirement_dialog = RetirementDialog()
    
    print("1. UI Integration Setup")
    print("-" * 40)
    integration_service.connect_with_vocabulary_card()
    audio_detector.setup_detection()
    handler_enhancer.enhance_handlers()
    print()
    
    print("2. Mock UI Components for Localhost Testing")
    print("-" * 40)
    # Set up mock current word
    integration_service.state.current_word = {
        'word': 'example',
        'meaning': 'a thing characteristic of its kind',
        'category': 'topic vocab'
    }
    print(f"Current word: {integration_service.state.current_word['word']}")
    print()
    
    print("3. Button Interaction Handling")
    print("-" * 40)
    
    # Test Next button
    print("Testing Next button:")
    next_interaction = integration_service.handle_next_click()
    progress_tracker.track_button_interaction(next_interaction)
    print()
    
    # Test Pause/Play button
    print("Testing Pause button:")
    pause_interaction = integration_service.handle_pause_play_click(False)
    progress_tracker.track_button_interaction(pause_interaction)
    print()
    
    print("Testing Play button:")
    play_interaction = integration_service.handle_pause_play_click(True)
    progress_tracker.track_button_interaction(play_interaction)
    print()
    
    print("4. Audio Completion Detection")
    print("-" * 40)
    print("Starting audio playback simulation...")
    audio_detector.start_audio_monitoring("example", 2.0)  # 2 second duration
    time.sleep(3)  # Wait for completion
    print()
    
    print("5. Retirement Functionality with Full Dialog Logic")
    print("-" * 40)
    
    def on_retirement_confirmed():
        retire_interaction = integration_service.handle_retire_click("example")
        progress_tracker.track_button_interaction(retire_interaction)
        progress_tracker.complete_progress_tracking("example")
    
    retirement_dialog.show_retirement_confirmation("example", on_retirement_confirmed)
    
    print("6. UI Preservation and Backward Compatibility")
    print("-" * 40)
    ui_preservation.ensure_no_visual_changes()
    ui_preservation.validate_original_behavior()
    print()
    
    print("7. Graceful Degradation Test")
    print("-" * 40)
    # Simulate integration failure
    test_error = Exception("Simulated integration failure")
    graceful_degradation.handle_integration_failure(test_error)
    
    # Test recovery
    print()
    recovery_success = graceful_degradation.attempt_recovery()
    print(f"Recovery successful: {recovery_success}")
    print()
    
    print("8. Progress Tracking Integration")
    print("-" * 40)
    progress_tracker.complete_progress_tracking("example")
    print()
    
    print("=== Unit 5 Demo Complete ===")

if __name__ == "__main__":
    demo_unit5()