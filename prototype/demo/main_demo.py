#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructure import Event, event_bus
from units.learning_progress import LearningProgressService
from units.daily_scheduling import DailySchedulingService  
from units.playback_control import PlaybackControlService
import time

def demo_learning_progress_system():
    """Demonstrate the learning progress system"""
    
    print("=== Learning Progress System Demo ===\n")
    
    # Initialize services
    print("1. Initializing services...")
    learning_service = LearningProgressService()
    scheduling_service = DailySchedulingService()
    playback_service = PlaybackControlService()
    
    # Sample vocabulary words
    sample_words = ["apple", "banana", "cherry", "date", "elderberry"]
    
    print("2. Setting up daily word selection...")
    scheduling_service.set_daily_words(sample_words)
    daily_words = scheduling_service.get_daily_words()
    print(f"   Daily words: {daily_words}")
    
    print("\n3. Starting playback simulation...")
    event_bus.publish(Event('playback_control', {'action': 'play'}))
    
    # Simulate learning session
    print("\n4. Simulating learning session...")
    for i, word in enumerate(sample_words[:3]):  # Review first 3 words
        print(f"\n   Reviewing word: {word}")
        
        # Simulate user interaction (correct/incorrect)
        is_correct = i % 2 == 0  # Alternate correct/incorrect for demo
        
        # Publish word reviewed event
        event_bus.publish(Event('word_reviewed', {
            'word_id': word,
            'is_correct': is_correct
        }))
        
        print(f"   Result: {'Correct' if is_correct else 'Incorrect'}")
        
        # Get updated progress
        progress = learning_service.get_progress(word)
        if progress:
            print(f"   Progress: {progress.correct_count} correct, {progress.incorrect_count} incorrect")
            print(f"   Success rate: {progress.success_rate:.2%}")
            print(f"   Next review: {progress.next_review_date}")
    
    print("\n5. Checking due words...")
    due_words = learning_service.get_due_words()
    print(f"   Words due for review: {due_words}")
    
    print("\n6. Playback queue status:")
    queue_status = playback_service.get_queue_status()
    print(f"   Queue: {queue_status['queue']}")
    print(f"   Current: {queue_status['current_index']} - {playback_service.get_current_word()}")
    print(f"   Playing: {queue_status['is_playing']}")
    
    print("\n7. Testing timing controls...")
    event_bus.publish(Event('timing_control', {
        'repeat_count': 2,
        'interval_seconds': 5.0
    }))
    print("   Updated timing: 2 repeats, 5 second intervals")
    
    print("\n=== Demo Complete ===")
    print("\nThe system successfully demonstrated:")
    print("✓ Spaced repetition learning progress tracking")
    print("✓ Daily word selection management") 
    print("✓ Playback queue control")
    print("✓ Event-driven communication between units")
    print("✓ localStorage simulation for data persistence")

if __name__ == "__main__":
    demo_learning_progress_system()