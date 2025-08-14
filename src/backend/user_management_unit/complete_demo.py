#!/usr/bin/env python3

import sys
import os
import json

# Add the parent directory to Python path to enable absolute imports
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, parent_dir)

from src.backend.user_management_unit.infrastructure.in_memory_user_repository import InMemoryUserRepository
from src.backend.user_management_unit.infrastructure.in_memory_session_repository import InMemorySessionRepository
from src.backend.user_management_unit.domain.services.authentication_service import AuthenticationService
from src.backend.user_management_unit.domain.services.user_registration_service import UserRegistrationService
from src.backend.user_management_unit.application.event_publisher import EventPublisher
from src.backend.user_management_unit.application.user_management_facade import UserManagementFacade
from src.backend.user_management_unit.api.auth_controller import AuthController

def main():
    print("=== Complete User Management System Demo ===\n")
    
    # Setup the complete system
    user_repo = InMemoryUserRepository()
    session_repo = InMemorySessionRepository()
    auth_service = AuthenticationService(user_repo, session_repo)
    registration_service = UserRegistrationService(user_repo)
    event_publisher = EventPublisher()
    
    facade = UserManagementFacade(auth_service, registration_service, event_publisher)
    controller = AuthController(facade)
    
    try:
        # Test API endpoints
        print("1. Testing Registration API...")
        register_data = {
            "email": "api@example.com",
            "nickname": "APIUser",
            "password": "password"
        }
        result = controller.register(register_data)
        print(f"   Registration result: {json.dumps(result, indent=2)}")
        
        print("\n2. Testing Login API...")
        login_data = {
            "email": "api@example.com",
            "password": "password",
            "device_type": "mobile"
        }
        result = controller.login(login_data)
        print(f"   Login result: {json.dumps(result, indent=2)}")
        
        # Extract session ID for validation
        session_id = result["data"]["session_id"] if result["success"] else None
        
        print("\n3. Testing Session Validation API...")
        validate_data = {"session_id": session_id}
        result = controller.validate_session(validate_data)
        print(f"   Validation result: {json.dumps(result, indent=2)}")
        
        print("\n4. Testing Error Handling...")
        # Test duplicate registration
        duplicate_result = controller.register(register_data)
        print(f"   Duplicate registration: {json.dumps(duplicate_result, indent=2)}")
        
        # Test invalid login
        invalid_login = controller.login({
            "email": "api@example.com",
            "password": "wrongpassword"
        })
        print(f"   Invalid login: {json.dumps(invalid_login, indent=2)}")
        
        print("\n5. System Events:")
        for i, event in enumerate(event_publisher.get_events(), 1):
            print(f"   {i}. {type(event).__name__} - User: {event.user_id}")
        
        print("\n6. Repository State:")
        print(f"   Users in repository: {len(user_repo._users)}")
        print(f"   Sessions in repository: {len(session_repo._sessions)}")
        
        print("\n=== Complete Demo Success! ===")
        print("\nThe User Management Unit is ready for integration with the vocabulary application.")
        print("Key features implemented:")
        print("- Domain-driven design with proper separation of concerns")
        print("- Event-driven architecture with domain events")
        print("- In-memory repositories for demo purposes")
        print("- RESTful API layer")
        print("- Comprehensive error handling")
        
        return 0
        
    except Exception as e:
        print(f"Demo failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit(main())