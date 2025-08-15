import time
import threading
from datetime import datetime

class AudioCompletionDetector:
    def __init__(self, integration_service):
        self.integration_service = integration_service
        self.current_utterance = None
        self.completion_callback = None
        self.is_monitoring = False
    
    def setup_detection(self):
        print("Audio completion detection setup complete")
    
    def start_audio_monitoring(self, word_key: str, duration: float = 3.0):
        """Simulate audio playback monitoring"""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        print(f"Starting audio monitoring for '{word_key}' ({duration}s)")
        
        # Simulate audio playback in separate thread
        monitor_thread = threading.Thread(
            target=self._monitor_audio_completion,
            args=(word_key, duration),
            daemon=True
        )
        monitor_thread.start()
    
    def _monitor_audio_completion(self, word_key: str, duration: float):
        time.sleep(duration)  # Simulate audio duration
        
        if self.is_monitoring:
            self._handle_audio_completion(word_key)
        
        self.is_monitoring = False
    
    def _handle_audio_completion(self, word_key: str):
        print(f"Audio completed for: {word_key}")
        
        # Update progress for completed word
        print(f"Updating progress for completed word: {word_key}")
        
        # Trigger auto-advance if enabled
        if self.integration_service.state.auto_advance_enabled:
            self._handle_auto_advance(word_key)
    
    def _handle_auto_advance(self, completed_word_key: str):
        print(f"Auto-advancing after completion of: {completed_word_key}")
        
        # Small delay for smooth transition
        time.sleep(0.5)
        
        # Simulate advancing to next word
        next_word = {"word": "next_example", "meaning": "Next word meaning"}
        self.integration_service.state.current_word = next_word
        
        print(f"Auto-advanced to: {next_word['word']}")
    
    def stop_monitoring(self):
        self.is_monitoring = False
        print("Audio monitoring stopped")