#!/usr/bin/env python3
"""
Demo script for Vocabulary Service Unit
Tests the core functionality of vocabulary management system
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.vocabulary_service_unit.infrastructure.in_memory_vocabulary_repository import InMemoryVocabularyRepository
from backend.vocabulary_service_unit.infrastructure.in_memory_category_repository import InMemoryCategoryRepository
from backend.vocabulary_service_unit.domain.services.vocabulary_search_service import VocabularySearchService
from backend.vocabulary_service_unit.application.vocabulary_query_service import VocabularyQueryService
from backend.vocabulary_service_unit.application.content_administration_service import ContentAdministrationService
from backend.vocabulary_service_unit.application.event_publisher import EventPublisher

def main():
    print("=== Vocabulary Service Unit Demo ===\n")
    
    # Initialize repositories
    vocabulary_repo = InMemoryVocabularyRepository()
    category_repo = InMemoryCategoryRepository()
    event_publisher = EventPublisher()
    
    # Initialize services
    search_service = VocabularySearchService(vocabulary_repo)
    query_service = VocabularyQueryService(vocabulary_repo, category_repo, search_service, event_publisher)
    admin_service = ContentAdministrationService(vocabulary_repo, category_repo, event_publisher)
    
    try:
        # Test 1: Create categories
        print("1. Creating categories...")
        basic_cat = admin_service.create_category("Basic Words", "Fundamental vocabulary")
        advanced_cat = admin_service.create_category("Advanced Words", "Complex vocabulary")
        print(f"   Created: {basic_cat['name']}")
        print(f"   Created: {advanced_cat['name']}")
        
        # Test 2: Add vocabulary words
        print("\n2. Adding vocabulary words...")
        words_data = [
            ("hello", "a greeting", basic_cat['category_id'], "Hello, how are you?", "hola"),
            ("goodbye", "a farewell", basic_cat['category_id'], "Goodbye, see you later!", "adiós"),
            ("sophisticated", "complex or refined", advanced_cat['category_id'], "She has sophisticated taste.", "sofisticado"),
            ("eloquent", "fluent and persuasive", advanced_cat['category_id'], "He gave an eloquent speech.", "elocuente")
        ]
        
        for word_text, meaning, cat_id, example, translation in words_data:
            word = admin_service.add_vocabulary_word(word_text, meaning, cat_id, example, translation)
            print(f"   Added: {word['word']} - {word['meaning']}")
        
        # Test 3: Query categories
        print("\n3. Querying categories...")
        categories = query_service.get_categories()
        for cat in categories:
            print(f"   {cat['name']}: {cat['word_count']} words")
        
        # Test 4: Query words by category
        print("\n4. Querying words by category...")
        basic_words = query_service.get_words_by_category(basic_cat['category_id'])
        print(f"   Basic words ({len(basic_words)}):")
        for word in basic_words:
            print(f"     - {word['word']}: {word['meaning']}")
        
        # Test 5: Search functionality
        print("\n5. Testing search functionality...")
        search_results = query_service.search_vocabulary("hello")
        print(f"   Search for 'hello' found {len(search_results)} results:")
        for word in search_results:
            print(f"     - {word['word']}: {word['meaning']}")
        
        search_results = query_service.search_vocabulary("sophisticated")
        print(f"   Search for 'sophisticated' found {len(search_results)} results:")
        for word in search_results:
            print(f"     - {word['word']}: {word['meaning']}")
        
        # Test 6: Check published events
        print("\n6. Published events:")
        events = event_publisher.get_events()
        for i, event in enumerate(events, 1):
            print(f"   {i}. {type(event).__name__}")
        
        print(f"\n=== Demo completed successfully! ===")
        print(f"Total events published: {len(events)}")
        
    except Exception as e:
        print(f"Error during demo: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())