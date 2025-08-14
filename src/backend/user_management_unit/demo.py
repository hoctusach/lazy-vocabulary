#!/usr/bin/env python3

import sys
import os

# Add the parent directory to Python path to enable absolute imports
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, parent_dir)

from src.backend.user_management_unit.infrastructure.in_memory_user_repository import InMemoryUserRepository
from src.backend.user_management_unit.infrastructure.in_memory_session_repository import InMemorySessionRepository
from src.backend.user_management_unit.domain.services.authentication_service import AuthenticationService
from src.backend.user_management_unit.domain.services.user_registration_service import UserRegistrationService
from src.backend.user_management_unit.application.event_publisher import EventPublisher
from src.backend.user_management_unit.application.user_management_facade import UserManagementFacade

def main():
    print("=== User Management Unit Demo ===\n")
    
    # Setup dependencies
    user_repo = InMemoryUserRepository()
    session_repo = InMemorySessionRepository()
    auth_service = AuthenticationService(user_repo, session_repo)
    registration_service = UserRegistrationService(user_repo)
    event_publisher = EventPublisher()
    
    facade = UserManagementFacade(auth_service, registration_service, event_publisher)
    
    try:
        # Test user registration
        print("1. Registering new user...")
        user = facade.register_user("test@example.com", "TestUser", "password")
        print(f"   User registered: {user.nickname} ({user.email})")
        
        # Test login
        print("\n2. Logging in user...")
        session = facade.login("test@example.com", "password", "web")
        if session:
            print(f"   Login successful! Session ID: {session.session_id}")
        else:
            print("   Login failed!")
        
        # Test session validation
        print("\n3. Validating session...")
        is_valid = facade.validate_session(session.session_id.value)
        print(f"   Session valid: {is_valid}")
        
        # Test duplicate registration
        print("\n4. Testing duplicate registration...")
        try:
            facade.register_user("test@example.com", "DuplicateUser", "password")
        except ValueError as e:
            print(f"   Expected error: {e}")
        
        # Test invalid login
        print("\n5. Testing invalid login...")
        invalid_session = facade.login("test@example.com", "wrongpassword", "web")
        print(f"   Invalid login result: {invalid_session}")
        
        # Show published events
        print("\n6. Published events:")
        for i, event in enumerate(event_publisher.get_events(), 1):
            print(f"   {i}. {type(event).__name__}")
        
        print("\n=== Demo completed successfully! ===")
        
    except Exception as e:
        print(f"Demo failed with error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())