"""
Comprehensive demo script for the unified Lazy Vocabulary backend service.
Demonstrates all functionality from the five original units in one cohesive demo.
"""
import json
from datetime import datetime
from service_factory import get_service_factory


def print_section(title: str):
    """Print a formatted section header."""
    print(f"\n{'='*60}")
    print(f" {title}")
    print(f"{'='*60}")


def print_result(operation: str, result: dict):
    """Print operation result in a formatted way."""
    status = "SUCCESS" if result.get("success") else "FAILED"
    print(f"{operation}: {status}")
    if result.get("success"):
        if "data" in result:
            print(f"  Data: {json.dumps(result['data'], indent=2, default=str)}")
        if "message" in result:
            print(f"  Message: {result['message']}")
    else:
        print(f"  Error: {result.get('error', 'Unknown error')}")
    print()


def demo_user_management(service):
    """Demo user management functionality."""
    print_section("USER MANAGEMENT DEMO")
    
    # Register users
    print("1. Registering users...")
    user1_result = service.register_user("alice@example.com", "Alice", "password123")
    print_result("Register Alice", user1_result)
    
    user2_result = service.register_user("bob@example.com", "Bob", "password456")
    print_result("Register Bob", user2_result)
    
    # Try to register duplicate user
    duplicate_result = service.register_user("alice@example.com", "Alice2", "password789")
    print_result("Register Duplicate User", duplicate_result)
    
    # Login users
    print("2. Logging in users...")
    alice_login = service.login_user("alice@example.com", "password123", "web")
    print_result("Alice Login", alice_login)
    
    bob_login = service.login_user("bob@example.com", "password456", "mobile")
    print_result("Bob Login", bob_login)
    
    # Invalid login
    invalid_login = service.login_user("alice@example.com", "wrongpassword", "web")
    print_result("Invalid Login", invalid_login)
    
    # Validate sessions
    print("3. Validating sessions...")
    if alice_login.get("success"):
        alice_session_id = alice_login["data"]["session_id"]
        alice_valid = service.validate_session(alice_session_id)
        print(f"Alice session valid: {alice_valid}")
    
    invalid_session_valid = service.validate_session("invalid-session-id")
    print(f"Invalid session valid: {invalid_session_valid}")
    
    return user1_result, user2_result, alice_login, bob_login


def demo_vocabulary_management(service):
    """Demo vocabulary management functionality - SKIPPED (using local JSON)."""
    print_section("VOCABULARY MANAGEMENT DEMO - SKIPPED")
    print("Vocabulary management is now handled by local JSON files.")
    print("The backend no longer manages vocabulary data directly.")
    return []


def demo_learning_progress(service, users, categories):
    """Demo learning progress functionality."""
    print_section("LEARNING PROGRESS DEMO")
    
    if not users[0].get("success"):
        print("Skipping learning progress demo - missing users")
        return
    
    alice_id = users[0]["data"]["user_id"]
    
    # Get daily learning list (returns word IDs only)
    print("1. Getting daily learning list...")
    daily_list = service.get_daily_learning_list(alice_id, 5)
    print_result("Daily Learning List (Word IDs)", {"success": True, "data": daily_list})
    
    # Record review events with sample word IDs
    print("2. Recording review events...")
    sample_word_ids = ["word-1", "word-2", "word-3"]
    for i, word_id in enumerate(sample_word_ids):
        accuracy = i % 2 == 0  # Alternate correct/incorrect
        response_time = 2000 + (i * 500)  # Varying response times
        
        review_result = service.record_review_event(alice_id, word_id, accuracy, response_time)
        print_result(f"Review '{word_id}' ({'correct' if accuracy else 'incorrect'})", review_result)
    
    # Get updated daily learning list
    print("3. Getting updated daily learning list...")
    updated_list = service.get_daily_learning_list(alice_id, 5)
    print_result("Updated Daily List (Word IDs)", {"success": True, "data": updated_list})


def demo_data_migration(service, users):
    """Demo data migration functionality."""
    print_section("DATA MIGRATION DEMO")
    
    if not users[1].get("success"):
        print("Skipping data migration demo - missing user")
        return
    
    bob_id = users[1]["data"]["user_id"]
    
    # Simulate local data
    local_data = {
        "progress": {
            "word-1": {
                "next_review_date": datetime.now().isoformat(),
                "interval_days": 3,
                "ease_factor": 2.6,
                "repetitions": 2
            },
            "word-2": {
                "next_review_date": datetime.now().isoformat(),
                "interval_days": 1,
                "ease_factor": 2.5,
                "repetitions": 0
            }
        },
        "settings": {
            "daily_goal": 20,
            "notifications_enabled": True
        }
    }
    
    print("1. Starting data migration...")
    migration_result = service.start_migration(bob_id, local_data)
    print_result("Data Migration", migration_result)


def demo_analytics(service):
    """Demo analytics functionality."""
    print_section("ANALYTICS DEMO")
    
    # Get user activity metrics
    print("1. Getting user activity metrics...")
    user_metrics = service.get_user_activity_metrics()
    print_result("User Activity Metrics", {"success": True, "data": user_metrics})
    
    # Get vocabulary analytics
    print("2. Getting vocabulary analytics...")
    vocab_analytics = service.get_vocabulary_analytics()
    print_result("Vocabulary Analytics", {"success": True, "data": vocab_analytics})


def demo_events(service):
    """Demo event publishing functionality."""
    print_section("DOMAIN EVENTS DEMO")
    
    # Get published events
    events = service.event_publisher.get_events()
    print(f"Total events published: {len(events)}")
    
    # Group events by type
    event_types = {}
    for event in events:
        event_type = event.event_type
        if event_type not in event_types:
            event_types[event_type] = 0
        event_types[event_type] += 1
    
    print("\nEvent summary:")
    for event_type, count in event_types.items():
        print(f"  {event_type}: {count}")
    
    # Show recent events
    print(f"\nRecent events (last 5):")
    for event in events[-5:]:
        print(f"  {event.timestamp.strftime('%H:%M:%S')} - {event.event_type}")


def main():
    """Run the comprehensive demo."""
    print("LAZY VOCABULARY UNIFIED BACKEND SERVICE DEMO")
    print("This demo showcases functionality from four backend units:")
    print("• User Management Unit")
    print("• Learning Progress Unit")
    print("• Data Migration Unit")
    print("• Analytics Unit")
    print("\nNote: Vocabulary Service Unit removed - vocabulary handled by local JSON files")
    
    # Initialize service
    factory = get_service_factory()
    service = factory.get_service()
    
    # Run demos
    users = demo_user_management(service)
    categories = demo_vocabulary_management(service)  # Now skipped
    demo_learning_progress(service, users, categories)
    demo_data_migration(service, users)
    demo_analytics(service)
    demo_events(service)
    
    print_section("DEMO COMPLETED")
    print("All functionality demonstrated successfully!")
    print("The unified service consolidates four backend units into one cohesive system.")
    print("Vocabulary data is now handled by local JSON files instead of the backend service.")
    print("\nNext steps:")
    print("• Integrate with frontend application")
    print("• Replace in-memory storage with persistent databases")
    print("• Add authentication middleware")
    print("• Deploy to cloud infrastructure")


if __name__ == "__main__":
    main()