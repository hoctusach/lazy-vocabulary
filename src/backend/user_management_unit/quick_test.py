"""Quick test for user management core functionality."""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from service_factory import UserManagementServiceFactory

def test_user_management():
    print("=== User Management Quick Test ===\n")
    
    factory = UserManagementServiceFactory()
    controller = factory.get_auth_controller()
    
    # Test 1: Registration
    print("1. Testing Registration")
    register_result = controller.register({
        "email": "test@example.com",
        "nickname": "TestUser",
        "password": "password123"
    })
    
    if register_result["success"]:
        print("[PASS] User registration successful")
        user_id = register_result["data"]["user_id"]
        token = register_result["data"]["token"]
    else:
        print(f"[FAIL] Registration failed: {register_result.get('error')}")
        return False
    
    # Test 2: Login
    print("2. Testing Login")
    login_result = controller.login({
        "email": "test@example.com",
        "password": "password123",
        "device_type": "web",
        "user_agent": "Test Browser",
        "ip_address": "127.0.0.1"
    })
    
    if login_result["success"]:
        print("[PASS] User login successful")
        session_id = login_result["data"]["session_id"]
        session_token = login_result["data"]["token"]
    else:
        print(f"[FAIL] Login failed: {login_result.get('error')}")
        return False
    
    # Test 3: Session validation
    print("3. Testing Session Validation")
    validate_result = controller.validate_session({"token": session_token})
    
    if validate_result["success"]:
        print("[PASS] Session validation successful")
    else:
        print(f"[FAIL] Session validation failed: {validate_result.get('error')}")
        return False
    
    # Test 4: Logout
    print("4. Testing Logout")
    logout_result = controller.logout({"session_id": session_id})
    
    if logout_result["success"]:
        print("[PASS] Logout successful")
    else:
        print(f"[FAIL] Logout failed: {logout_result.get('error')}")
        return False
    
    # Test 5: Duplicate registration
    print("5. Testing Duplicate Registration Prevention")
    duplicate_result = controller.register({
        "email": "test@example.com",
        "nickname": "AnotherUser",
        "password": "password456"
    })
    
    if not duplicate_result["success"]:
        print("[PASS] Duplicate registration properly prevented")
    else:
        print("[FAIL] Duplicate registration was allowed")
        return False
    
    print("\n=== All tests passed! ===")
    return True

if __name__ == "__main__":
    success = test_user_management()
    if success:
        print("User management backend is working correctly!")
    else:
        print("User management backend has issues!")