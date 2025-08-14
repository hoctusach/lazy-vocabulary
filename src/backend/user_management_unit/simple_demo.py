"""Simple demo without JWT dependencies."""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from domain.value_objects import Email, Nickname, UserId, SessionId, DeviceInfo
from domain.entities import User, UserSession
from domain.services import UserRegistrationService, SessionManagementService
from infrastructure.in_memory_repositories import InMemoryUserRepository, InMemorySessionRepository


def main():
    print("=== User Management Unit Simple Demo ===\n")
    
    # Initialize repositories
    user_repo = InMemoryUserRepository()
    session_repo = InMemorySessionRepository()
    
    # Initialize services
    registration_service = UserRegistrationService(user_repo)
    session_service = SessionManagementService()
    
    # Test 1: Create user
    print("1. Testing User Creation")
    try:
        email = Email("test@example.com")
        nickname = Nickname("TestUser")
        user = registration_service.create_user(email, nickname)
        user_repo.save(user)
        print(f"[OK] User created: {user.user_id.value}")
        print(f"  Email: {user.email.value}")
        print(f"  Nickname: {user.nickname.value}")
        print(f"  Created: {user.created_at}\n")
    except Exception as e:
        print(f"[FAIL] User creation failed: {e}\n")
        return
    
    # Test 2: Find user by email
    print("2. Testing User Lookup")
    found_user = user_repo.find_by_email(email)
    if found_user:
        print(f"[OK] User found by email: {found_user.user_id.value}")
    else:
        print("[FAIL] User not found by email")
    
    found_by_id = user_repo.find_by_id(user.user_id)
    if found_by_id:
        print(f"[OK] User found by ID: {found_by_id.email.value}\n")
    else:
        print("[FAIL] User not found by ID\n")
    
    # Test 3: Duplicate email check
    print("3. Testing Duplicate Email Prevention")
    try:
        duplicate_user = registration_service.create_user(email, Nickname("AnotherUser"))
        print("[FAIL] Duplicate email was allowed (should not happen)")
    except ValueError as e:
        print(f"[OK] Duplicate email properly rejected: {e}\n")
    
    # Test 4: Create session
    print("4. Testing Session Creation")
    device_info = DeviceInfo(
        device_type="web",
        user_agent="Demo Browser",
        ip_address="127.0.0.1"
    )
    
    session = session_service.create_session(user.user_id, device_info)
    session_repo.save(session)
    print(f"[OK] Session created: {session.session_id.value}")
    print(f"  User ID: {session.user_id.value}")
    print(f"  Device: {session.device_info.device_type}")
    print(f"  Created: {session.created_at}\n")
    
    # Test 5: Find session
    print("5. Testing Session Lookup")
    found_session = session_repo.find_by_session_id(session.session_id)
    if found_session:
        print(f"[OK] Session found: {found_session.session_id.value}")
    else:
        print("[FAIL] Session not found")
    
    user_sessions = session_repo.find_active_by_user_id(user.user_id)
    print(f"[OK] Active sessions for user: {len(user_sessions)}\n")
    
    # Test 6: Multiple sessions
    print("6. Testing Multiple Sessions")
    mobile_device = DeviceInfo(
        device_type="mobile",
        user_agent="Mobile App",
        ip_address="192.168.1.100"
    )
    
    mobile_session = session_service.create_session(user.user_id, mobile_device)
    session_repo.save(mobile_session)
    
    all_sessions = session_repo.find_active_by_user_id(user.user_id)
    print(f"[OK] Total active sessions: {len(all_sessions)}")
    for s in all_sessions:
        print(f"  - {s.session_id.value} ({s.device_info.device_type})")
    print()
    
    # Test 7: Session invalidation
    print("7. Testing Session Invalidation")
    session.invalidate()
    session_repo.save(session)
    
    active_sessions = session_repo.find_active_by_user_id(user.user_id)
    print(f"[OK] Active sessions after invalidation: {len(active_sessions)}")
    
    # Test 8: Value object validation
    print("8. Testing Value Object Validation")
    try:
        invalid_email = Email("invalid-email")
        print("[FAIL] Invalid email was accepted")
    except ValueError:
        print("[OK] Invalid email properly rejected")
    
    try:
        invalid_nickname = Nickname("ab")  # Too short
        print("[FAIL] Invalid nickname was accepted")
    except ValueError:
        print("[OK] Invalid nickname properly rejected")
    
    try:
        invalid_user_id = UserId("not-a-uuid")
        print("[FAIL] Invalid user ID was accepted")
    except ValueError:
        print("[OK] Invalid user ID properly rejected")
    
    print("\n=== Simple demo completed successfully! ===")


if __name__ == "__main__":
    main()