#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(__file__))

from events.event_bus import EventBus
from events.event_handlers import EventHandlers
from services.learning_progress_integrator import LearningProgressIntegrator
from services.component_initializer import ComponentInitializer
from services.progress_update_coordinator import ProgressUpdateCoordinator
from services.date_change_monitor import DateChangeMonitor
from models.learning_progress import LearningProgress, LearningStatus
from repositories.learning_progress_repository import LearningProgressRepository
from datetime import datetime
import time

def demo_unit4():
    print("=== Unit 4: Learning Progress Integration Demo ===\n")
    
    # Initialize event system
    event_bus = EventBus()
    event_handlers = EventHandlers()
    
    # Subscribe to events
    event_bus.subscribe('AppStarted', event_handlers.handle_app_started)
    event_bus.subscribe('DateChanged', event_handlers.handle_date_changed)
    event_bus.subscribe('ProgressUpdated', event_handlers.handle_progress_updated)
    event_bus.subscribe('StatsRefreshed', event_handlers.handle_stats_refreshed)
    
    # Initialize services
    integrator = LearningProgressIntegrator(event_bus)
    component_initializer = ComponentInitializer(integrator)
    progress_coordinator = ProgressUpdateCoordinator(event_bus)
    date_monitor = DateChangeMonitor(integrator)
    
    print("1. App Initialization Sequence")
    print("-" * 40)
    integrator.initialize_on_app_start()
    component_initializer.initialize_components()
    print()
    
    print("2. Creating Sample Learning Progress Data")
    print("-" * 40)
    progress_repo = LearningProgressRepository()
    
    # Create sample words
    sample_words = [
        LearningProgress(
            word="example",
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
            review_count=2,
            last_played_date=datetime.now().strftime('%Y-%m-%d'),
            status=LearningStatus.DUE,
            next_review_date=datetime.now().strftime('%Y-%m-%d'),
            created_date=datetime.now().strftime('%Y-%m-%d')
        )
    ]
    
    for word in sample_words:
        progress_repo.save(word.word, word)
        print(f"Created progress for: {word.word} (Status: {word.status.value})")
    print()
    
    print("3. Progress Updates and Event Flow")
    print("-" * 40)
    progress_coordinator.update_word_progress("example", "COMPLETION")
    progress_coordinator.update_word_progress("demonstrate", "MANUAL_ADVANCE")
    print()
    
    print("4. Word Retirement Functionality")
    print("-" * 40)
    progress_coordinator.retire_word("example")
    
    # Verify retirement
    retired_word = progress_repo.get("example")
    if retired_word:
        print(f"Word 'example' status: {retired_word.status.value}")
        print(f"Retirement date: {retired_word.retired_date}")
        print(f"Next review date: {retired_word.next_review_date}")
    print()
    
    print("5. Date Change Detection")
    print("-" * 40)
    print("Starting date change monitoring (will run for 5 seconds)...")
    date_monitor.start_monitoring()
    time.sleep(5)
    date_monitor.stop_monitoring()
    print()
    
    print("6. Data Migration Test")
    print("-" * 40)
    # Test data migration by loading all progress
    all_progress = progress_repo.get_all()
    print(f"Loaded {len(all_progress)} words with migrated data:")
    for word_key, progress in all_progress.items():
        print(f"  {word_key}: {progress.status.value} (created: {progress.created_date})")
    print()
    
    print("=== Unit 4 Demo Complete ===")

if __name__ == "__main__":
    demo_unit4()