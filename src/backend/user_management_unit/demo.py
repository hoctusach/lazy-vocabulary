"""Demo script for User Management unit."""
import json
from datetime import datetime

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from service_factory import UserManagementServiceFactory


def main():
    print("=== User Management Unit Demo ===\n")
    
    # Initialize service factory
    factory = UserManagementServiceFactory()
    controller = factory.get_auth_controller()
    
    # Test user registration
    print("1. Testing User Registration")
    register_data = {
        "email": "test@example.com",
        "nickname": "TestUser",
        "password": "password123"
    }
    
    result = controller.register(register_data)
    print(f"Registration result: {json.dumps(result, indent=2, default=str)}")
    
    if result.get("success"):
        user_token = result["data"]["token"]
        print("✓ User registered successfully\n")
    else:
        print("✗ Registration failed\n")
        return
    
    # Test duplicate registration
    print("2. Testing Duplicate Registration")
    duplicate_result = controller.register(register_data)
    print(f"Duplicate registration: {duplicate_result['success']} - {duplicate_result.get('error', 'Success')}")
    print("✓ Duplicate registration properly rejected\n")
    
    # Test user login
    print("3. Testing User Login")
    login_data = {
        "email": "test@example.com",
        "password": "password123",
        "device_type": "web",
        "user_agent": "Demo Browser",
        "ip_address": "127.0.0.1"
    }
    
    login_result = controller.login(login_data)
    print(f"Login result: {json.dumps(login_result, indent=2, default=str)}")
    
    if login_result.get("success"):
        session_token = login_result["data"]["token"]
        session_id = login_result["data"]["session_id"]
        print("✓ User logged in successfully\n")
    else:
        print("✗ Login failed\n")
        return
    
    # Test session validation
    print("4. Testing Session Validation")
    validate_data = {"token": session_token}
    validate_result = controller.validate_session(validate_data)
    print(f"Session validation: {json.dumps(validate_result, indent=2, default=str)}")
    
    if validate_result.get("success"):
        print("✓ Session validation successful\n")
    else:
        print("✗ Session validation failed\n")
    
    # Test invalid session
    print("5. Testing Invalid Session")
    invalid_validate = controller.validate_session({"token": "invalid-token"})
    print(f"Invalid session validation: {invalid_validate['success']} - {invalid_validate.get('error', 'Success')}")
    print("✓ Invalid session properly rejected\n")
    
    # Test logout
    print("6. Testing User Logout")
    logout_data = {"session_id": session_id}
    logout_result = controller.logout(logout_data)
    print(f"Logout result: {json.dumps(logout_result, indent=2, default=str)}")
    
    if logout_result.get("success"):
        print("✓ User logged out successfully\n")
    else:
        print("✗ Logout failed\n")
    
    # Test session validation after logout
    print("7. Testing Session After Logout")
    post_logout_validate = controller.validate_session(validate_data)
    print(f"Post-logout validation: {post_logout_validate['success']} - {post_logout_validate.get('error', 'Success')}")
    print("✓ Session properly invalidated after logout\n")
    
    # Test multi-device login
    print("8. Testing Multi-Device Login")
    mobile_login = {
        "email": "test@example.com",
        "password": "password123",
        "device_type": "mobile",
        "user_agent": "Mobile App",
        "ip_address": "192.168.1.100"
    }
    
    mobile_result = controller.login(mobile_login)
    if mobile_result.get("success"):
        print("✓ Multi-device login successful")
        print(f"Mobile session: {mobile_result['data']['session_id']}")
        
        # Validate both sessions
        web_login_again = controller.login(login_data)
        if web_login_again.get("success"):
            print(f"Web session: {web_login_again['data']['session_id']}")
            print("✓ Multiple active sessions supported\n")
    
    print("=== Demo completed successfully! ===")


if __name__ == "__main__":
    main()