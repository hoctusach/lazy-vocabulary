"""Integration test for User Management API."""
import requests
import json
import time

API_BASE = "http://localhost:8001"

def test_integration():
    print("=== User Management API Integration Test ===\n")
    
    # Test 1: Health check
    print("1. Testing Health Check")
    try:
        response = requests.get(f"{API_BASE}/health")
        if response.status_code == 200:
            print("[OK] Health check passed")
            print(f"Response: {response.json()}\n")
        else:
            print(f"[FAIL] Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] Cannot connect to server: {e}")
        print("Make sure the server is running with: python server.py\n")
        return False
    
    # Test 2: User registration
    print("2. Testing User Registration")
    register_data = {
        "email": "integration@test.com",
        "nickname": "IntegrationTest",
        "password": "test123456"
    }
    
    try:
        response = requests.post(f"{API_BASE}/api/auth/register", json=register_data)
        if response.status_code == 200:
            user_data = response.json()
            print("[OK] User registration successful")
            print(f"User ID: {user_data['user_id']}")
            print(f"Email: {user_data['email']}")
            print(f"Nickname: {user_data['nickname']}\n")
        else:
            print(f"[FAIL] Registration failed: {response.status_code}")
            print(f"Error: {response.text}\n")
            return False
    except Exception as e:
        print(f"[FAIL] Registration request failed: {e}\n")
        return False
    
    # Test 3: User login
    print("3. Testing User Login")
    login_data = {
        "email": "integration@test.com",
        "password": "test123456",
        "device_type": "web",
        "user_agent": "Integration Test",
        "ip_address": "127.0.0.1"
    }
    
    try:
        response = requests.post(f"{API_BASE}/api/auth/login", json=login_data)
        if response.status_code == 200:
            session_data = response.json()
            print("[OK] User login successful")
            print(f"Session ID: {session_data['session_id']}")
            print(f"Token: {session_data['token'][:20]}...")
            print(f"Expires: {session_data['expires_at']}\n")
            
            token = session_data['token']
            session_id = session_data['session_id']
        else:
            print(f"[FAIL] Login failed: {response.status_code}")
            print(f"Error: {response.text}\n")
            return False
    except Exception as e:
        print(f"[FAIL] Login request failed: {e}\n")
        return False
    
    # Test 4: Session validation
    print("4. Testing Session Validation")
    validate_data = {"token": token}
    
    try:
        response = requests.post(f"{API_BASE}/api/auth/validate", json=validate_data)
        if response.status_code == 200:
            validation_data = response.json()
            print("[OK] Session validation successful")
            print(f"Valid: {validation_data['is_valid']}")
            print(f"User ID: {validation_data['user_id']}\n")
        else:
            print(f"[FAIL] Session validation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] Session validation request failed: {e}\n")
        return False
    
    # Test 5: Logout
    print("5. Testing User Logout")
    logout_data = {"session_id": session_id}
    
    try:
        response = requests.post(f"{API_BASE}/api/auth/logout", json=logout_data)
        if response.status_code == 200:
            print("[OK] User logout successful")
            print(f"Response: {response.json()}\n")
        else:
            print(f"[FAIL] Logout failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] Logout request failed: {e}\n")
        return False
    
    # Test 6: Session validation after logout
    print("6. Testing Session After Logout")
    try:
        response = requests.post(f"{API_BASE}/api/auth/validate", json=validate_data)
        if response.status_code == 401:
            print("[OK] Session properly invalidated after logout\n")
        else:
            validation_data = response.json()
            if not validation_data.get('is_valid', True):
                print("[OK] Session properly invalidated after logout\n")
            else:
                print("[FAIL] Session still valid after logout\n")
                return False
    except Exception as e:
        print(f"[FAIL] Post-logout validation failed: {e}\n")
        return False
    
    print("=== All integration tests passed! ===")
    return True

if __name__ == "__main__":
    if test_integration():
        print("✅ Integration test successful - Frontend can connect to backend!")
    else:
        print("❌ Integration test failed - Check server and try again")