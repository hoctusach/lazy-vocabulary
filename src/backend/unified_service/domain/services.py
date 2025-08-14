"""
Unified domain services for the Lazy Vocabulary backend service.
Consolidates domain services from all five original units.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import hashlib
import math

from domain.entities import User, UserSession, UserProgress, ReviewEvent
from domain.repositories import UserRepository, SessionRepository, UserProgressRepository
from domain.value_objects import generate_id


class AuthenticationService:
    """Domain service for user authentication."""
    
    def __init__(self, user_repo: UserRepository, session_repo: SessionRepository):
        self.user_repo = user_repo
        self.session_repo = session_repo
    
    def authenticate(self, email: str, password: str, device_info: str) -> Optional[UserSession]:
        """Authenticate user and create session."""
        user = self.user_repo.find_by_email(email)
        if not user or not self._verify_password(password, user.password_hash):
            return None
        
        session = UserSession(
            session_id=generate_id(),
            user_id=user.user_id,
            device_info=device_info,
            expires_at=datetime.now() + timedelta(days=30)
        )
        
        self.session_repo.save(session)
        return session
    
    def validate_session(self, session_id: str) -> bool:
        """Validate if session is active and not expired."""
        session = self.session_repo.find_by_id(session_id)
        return (session is not None and 
                session.is_active and 
                session.expires_at > datetime.now())
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash."""
        return self._hash_password(password) == password_hash
    
    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()


class UserRegistrationService:
    """Domain service for user registration."""
    
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo
    
    def register_user(self, email: str, nickname: str, password: str) -> User:
        """Register a new user."""
        if self.user_repo.exists_by_email(email):
            raise ValueError(f"User with email {email} already exists")
        
        user = User(
            user_id=generate_id(),
            email=email,
            nickname=nickname,
            password_hash=self._hash_password(password)
        )
        
        self.user_repo.save(user)
        return user
    
    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()





class SRSAlgorithmService:
    """Domain service for Spaced Repetition System algorithm."""
    
    def calculate_next_review(self, progress: UserProgress, response_accuracy: bool) -> UserProgress:
        """Calculate next review date based on SRS algorithm."""
        if response_accuracy:
            # Correct response
            if progress.repetitions == 0:
                progress.interval_days = 1
            elif progress.repetitions == 1:
                progress.interval_days = 6
            else:
                progress.interval_days = int(progress.interval_days * progress.ease_factor)
            
            progress.repetitions += 1
            progress.ease_factor = max(1.3, progress.ease_factor + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)))
        else:
            # Incorrect response
            progress.repetitions = 0
            progress.interval_days = 1
            progress.ease_factor = max(1.3, progress.ease_factor - 0.2)
        
        progress.next_review_date = datetime.now() + timedelta(days=progress.interval_days)
        progress.last_reviewed = datetime.now()
        
        return progress


class DailyListGenerationService:
    """Domain service for generating daily learning lists."""
    
    def __init__(self, progress_repo: UserProgressRepository):
        self.progress_repo = progress_repo
    
    def generate_daily_list(self, user_id: str, list_size: int = 20) -> List[str]:
        """Generate daily learning list for user - returns word IDs only."""
        # Get words due for review
        due_progress = self.progress_repo.find_due_for_review(user_id, datetime.now())
        due_word_ids = [p.word_id for p in due_progress]
        
        # Return only word IDs - vocabulary data will come from local JSON
        return due_word_ids[:list_size]


class MigrationOrchestrationService:
    """Domain service for orchestrating data migration."""
    
    def __init__(self, progress_repo: UserProgressRepository):
        self.progress_repo = progress_repo
    
    def merge_local_data(self, user_id: str, local_data: Dict[str, Any]) -> Dict[str, int]:
        """Merge local progress data with cloud data."""
        merged_count = 0
        skipped_count = 0
        
        # Process local progress data
        if 'progress' in local_data:
            for word_id, local_progress in local_data['progress'].items():
                existing = self.progress_repo.find_by_user_and_word(user_id, word_id)
                
                if not existing:
                    # Create new progress entry
                    progress = UserProgress(
                        progress_id=generate_id(),
                        user_id=user_id,
                        word_id=word_id,
                        next_review_date=datetime.fromisoformat(local_progress.get('next_review_date', datetime.now().isoformat())),
                        interval_days=local_progress.get('interval_days', 1),
                        ease_factor=local_progress.get('ease_factor', 2.5),
                        repetitions=local_progress.get('repetitions', 0)
                    )
                    self.progress_repo.save(progress)
                    merged_count += 1
                else:
                    # Skip existing entries (cloud data takes precedence)
                    skipped_count += 1
        
        return {
            'merged': merged_count,
            'skipped': skipped_count
        }