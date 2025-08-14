"""Test full Cognito integration with registration and login."""
import requests
import json
import time

API_BASE = "http://localhost:8001"

def test_cognito_integration():
    print("=== Cognito Integration Test ===\n")
    
    # Test 1: Health check
    print("1. Health Check")
    try:
        response = requests.get(f"{API_BASE}/health")
        health_data = response.json()
        print(f"[OK] {health_data}")
        if health_data.get('backend') != 'cognito':
            print("[WARNING] Not using Cognito backend")
            return False
    except Exception as e:
        print(f"[FAIL] Health check failed: {e}")
        return False
    
    # Test 2: User registration with Cognito
    print("\n2. User Registration (Cognito)")
    test_email = f"test-{int(time.time())}@example.com"
    register_data = {
        "email": test_email,
        "nickname": "CognitoTestUser",
        "password": "TestPass123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/api/auth/register", json=register_data)
        if response.status_code == 200:
            user_data = response.json()
            print(f"[OK] User registered: {user_data['user_id']}")
            print(f"Email: {user_data['email']}")
        else:
            print(f"[FAIL] Registration failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Registration error: {e}")
        return False
    
    # Test 3: User login with Cognito
    print("\n3. User Login (Cognito)")
    login_data = {
        "email": test_email,
        "password": "TestPass123",
        "device_type": "web",
        "user_agent": "Cognito Test",
        "ip_address": "127.0.0.1"
    }
    
    try:
        response = requests.post(f"{API_BASE}/api/auth/login", json=login_data)
        if response.status_code == 200:
            session_data = response.json()
            print(f"[OK] Login successful")
            print(f"Session ID: {session_data['session_id']}")
            print(f"Token: {session_data['token'][:20]}...")
            
            token = session_data['token']
            session_id = session_data['session_id']
        else:
            print(f"[FAIL] Login failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Login error: {e}")
        return False
    
    # Test 4: Session validation
    print("\n4. Session Validation")
    try:
        response = requests.post(f"{API_BASE}/api/auth/validate", json={"token": token})
        if response.status_code == 200:
            validation_data = response.json()
            print(f"[OK] Session valid: {validation_data['is_valid']}")
        else:
            print(f"[FAIL] Validation failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] Validation error: {e}")
        return False
    
    print("\n[SUCCESS] Cognito integration working perfectly!")
    print(f"Test user created: {test_email}")
    print("Frontend can now use AWS Cognito authentication!")
    return True

if __name__ == "__main__":
    test_cognito_integration()