#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Integration Demo for Vocabulary Service Unit
Shows how the backend can integrate with the current application
"""

import sys
import os
import json

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.vocabulary_service_unit.service_factory import VocabularyServiceFactory

def simulate_frontend_requests():
    """Simulate requests that would come from the frontend application"""
    
    print("=== Vocabulary Service Integration Demo ===\n")
    
    # Initialize the service
    factory = VocabularyServiceFactory()
    controller = factory.get_controller()
    
    # Simulate API requests
    print("1. Frontend: Creating initial categories...")
    
    # Create categories (like the current app might have)
    categories_to_create = [
        {"name": "Common Words", "description": "Frequently used vocabulary"},
        {"name": "Academic", "description": "Academic and formal vocabulary"},
        {"name": "Business", "description": "Business and professional terms"}
    ]
    
    created_categories = []
    for cat_data in categories_to_create:
        response = controller.create_category(cat_data["name"], cat_data["description"])
        if response["success"]:
            created_categories.append(response["data"])
            print(f"   + Created: {response['data']['name']}")
        else:
            print(f"   - Failed: {response['error']}")
    
    print(f"\n2. Frontend: Adding vocabulary words...")
    
    # Add words that might come from the current app's data
    words_to_add = [
        {"word": "learn", "meaning": "to acquire knowledge", "category": "Common Words", 
         "example": "I want to learn Spanish", "translation": "aprender"},
        {"word": "study", "meaning": "to examine in detail", "category": "Academic",
         "example": "She studies medicine", "translation": "estudiar"},
        {"word": "meeting", "meaning": "a gathering of people", "category": "Business",
         "example": "We have a meeting at 3 PM", "translation": "reunión"},
        {"word": "practice", "meaning": "to do repeatedly to improve", "category": "Common Words",
         "example": "Practice makes perfect", "translation": "practicar"}
    ]
    
    # Find category IDs
    cat_map = {cat["name"]: cat["category_id"] for cat in created_categories}
    
    for word_data in words_to_add:
        category_id = cat_map.get(word_data["category"])
        if category_id:
            response = controller.add_word(
                word_data["word"], 
                word_data["meaning"], 
                category_id,
                word_data.get("example"),
                word_data.get("translation")
            )
            if response["success"]:
                print(f"   + Added: {word_data['word']}")
            else:
                print(f"   - Failed: {response['error']}")
    
    print(f"\n3. Frontend: Fetching categories for UI...")
    response = controller.get_categories()
    if response["success"]:
        print("   Categories available:")
        for cat in response["data"]:
            print(f"     - {cat['name']}: {cat['word_count']} words")
    
    print(f"\n4. Frontend: Getting words for spaced repetition...")
    # Get words from a specific category (like for spaced repetition)
    common_cat_id = cat_map.get("Common Words")
    if common_cat_id:
        response = controller.get_words_by_category(common_cat_id)
        if response["success"]:
            print(f"   Common words for practice ({len(response['data'])}):")
            for word in response["data"]:
                print(f"     - {word['word']}: {word['meaning']}")
    
    print(f"\n5. Frontend: Search functionality...")
    # Test search (like user searching for words)
    search_queries = ["learn", "practice", "meeting"]
    for query in search_queries:
        response = controller.search_vocabulary(query)
        if response["success"]:
            print(f"   Search '{query}': {len(response['data'])} results")
            for word in response["data"]:
                print(f"     - {word['word']}: {word['meaning']}")
    
    print(f"\n6. Integration points with current app:")
    print("   + Categories can populate dropdown menus")
    print("   + Words can be fetched for spaced repetition algorithm")
    print("   + Search can power the vocabulary lookup feature")
    print("   + New words can be added from user input")
    print("   + Events can trigger UI updates and analytics")
    
    print(f"\n=== Integration Demo Completed Successfully! ===")

def show_api_examples():
    """Show example API calls that the frontend would make"""
    
    print(f"\n=== API Integration Examples ===")
    print("The frontend application can integrate using these patterns:")
    
    print(f"\n1. Initialize the service:")
    print("   factory = VocabularyServiceFactory()")
    print("   controller = factory.get_controller()")
    
    print(f"\n2. Get categories for UI dropdowns:")
    print("   response = controller.get_categories()")
    print("   categories = response['data'] if response['success'] else []")
    
    print(f"\n3. Get words for spaced repetition:")
    print("   response = controller.get_words_by_category(category_id)")
    print("   words = response['data'] if response['success'] else []")
    
    print(f"\n4. Search vocabulary:")
    print("   response = controller.search_vocabulary(user_query)")
    print("   results = response['data'] if response['success'] else []")
    
    print(f"\n5. Add new vocabulary:")
    print("   response = controller.add_word(word, meaning, category_id, example, translation)")

if __name__ == "__main__":
    simulate_frontend_requests()
    show_api_examples()