"""
Unified application service for the Lazy Vocabulary backend.
Consolidates all application services from the five original units.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from domain.entities import (
    User, UserSession, UserProgress, 
    ReviewEvent, MigrationSession, UserActivityMetrics, VocabularyAnalytics,
    MigrationStatus
)
from domain.repositories import (
    UserRepository, SessionRepository,
    UserProgressRepository, ReviewEventRepository, MigrationSessionRepository, AnalyticsRepository
)
from domain.services import (
    AuthenticationService, UserRegistrationService,
    SRSAlgorithmService, DailyListGenerationService, MigrationOrchestrationService
)
from domain.value_objects import generate_id
from domain.events import *


class EventPublisher:
    """Simple in-memory event publisher."""
    
    def __init__(self):
        self.events: List[DomainEvent] = []
    
    def publish(self, event: DomainEvent) -> None:
        """Publish a domain event."""
        self.events.append(event)
        print(f"Event published: {event.event_type} - {event.event_id}")
    
    def get_events(self) -> List[DomainEvent]:
        """Get all published events."""
        return self.events.copy()
    
    def clear_events(self) -> None:
        """Clear all events."""
        self.events.clear()


class LazyVocabularyService:
    """Unified application service for all Lazy Vocabulary functionality."""
    
    def __init__(self,
                 user_repo: UserRepository,
                 session_repo: SessionRepository,
                 progress_repo: UserProgressRepository,
                 review_repo: ReviewEventRepository,
                 migration_repo: MigrationSessionRepository,
                 analytics_repo: AnalyticsRepository,
                 event_publisher: EventPublisher):
        
        # Repositories
        self.user_repo = user_repo
        self.session_repo = session_repo
        self.progress_repo = progress_repo
        self.review_repo = review_repo
        self.migration_repo = migration_repo
        self.analytics_repo = analytics_repo
        
        # Event publisher
        self.event_publisher = event_publisher
        
        # Domain services
        self.auth_service = AuthenticationService(user_repo, session_repo)
        self.registration_service = UserRegistrationService(user_repo)
        self.srs_service = SRSAlgorithmService()
        self.daily_list_service = DailyListGenerationService(progress_repo)
        self.migration_service = MigrationOrchestrationService(progress_repo)
    
    # User Management Methods
    def register_user(self, email: str, nickname: str, password: str) -> Dict[str, Any]:
        """Register a new user."""
        try:
            user = self.registration_service.register_user(email, nickname, password)
            
            # Publish event
            event = UserRegistered(
                event_id=generate_id(),
                timestamp=datetime.now(),
                event_type="UserRegistered",
                user_id=user.user_id,
                email=user.email,
                nickname=user.nickname
            )
            self.event_publisher.publish(event)
            
            return {
                "success": True,
                "data": {
                    "user_id": user.user_id,
                    "email": user.email,
                    "nickname": user.nickname
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def login_user(self, email: str, password: str, device_info: str = "web") -> Dict[str, Any]:
        """Authenticate user and create session."""
        try:
            session = self.auth_service.authenticate(email, password, device_info)
            if not session:
                return {"success": False, "error": "Invalid credentials"}
            
            # Publish event
            event = UserLoggedIn(
                event_id=generate_id(),
                timestamp=datetime.now(),
                event_type="UserLoggedIn",
                user_id=session.user_id,
                session_id=session.session_id,
                device_info=device_info
            )
            self.event_publisher.publish(event)
            
            return {
                "success": True,
                "data": {
                    "session_id": session.session_id,
                    "user_id": session.user_id,
                    "expires_at": session.expires_at.isoformat()
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_session(self, session_id: str) -> bool:
        """Validate user session."""
        return self.auth_service.validate_session(session_id)
    

    
    # Learning Progress Methods
    def record_review_event(self, user_id: str, word_id: str, 
                           response_accuracy: bool, response_time_ms: int) -> Dict[str, Any]:
        """Record a vocabulary review event."""
        try:
            # Create review event
            event = ReviewEvent(
                event_id=generate_id(),
                user_id=user_id,
                word_id=word_id,
                response_accuracy=response_accuracy,
                response_time_ms=response_time_ms
            )
            self.review_repo.save(event)
            
            # Update user progress
            progress = self.progress_repo.find_by_user_and_word(user_id, word_id)
            if not progress:
                progress = UserProgress(
                    progress_id=generate_id(),
                    user_id=user_id,
                    word_id=word_id,
                    next_review_date=datetime.now()
                )
            
            progress = self.srs_service.calculate_next_review(progress, response_accuracy)
            self.progress_repo.save(progress)
            
            # Publish events
            review_event = ReviewEventRecorded(
                event_id=generate_id(),
                timestamp=datetime.now(),
                event_type="ReviewEventRecorded",
                user_id=user_id,
                word_id=word_id,
                response_accuracy=response_accuracy,
                response_time_ms=response_time_ms
            )
            self.event_publisher.publish(review_event)
            
            progress_event = ProgressUpdated(
                event_id=generate_id(),
                timestamp=datetime.now(),
                event_type="ProgressUpdated",
                user_id=user_id,
                word_id=word_id,
                next_review_date=progress.next_review_date,
                interval_days=progress.interval_days
            )
            self.event_publisher.publish(progress_event)
            
            return {"success": True, "data": {"next_review": progress.next_review_date.isoformat()}}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_daily_learning_list(self, user_id: str, list_size: int = 20) -> List[str]:
        """Generate daily learning list for user - returns word IDs only."""
        word_ids = self.daily_list_service.generate_daily_list(user_id, list_size)
        return word_ids
    
    # Data Migration Methods
    def start_migration(self, user_id: str, local_data: Dict[str, Any]) -> Dict[str, Any]:
        """Start data migration process."""
        try:
            session = MigrationSession(
                session_id=generate_id(),
                user_id=user_id,
                status=MigrationStatus.IN_PROGRESS,
                local_data_snapshot=local_data
            )
            self.migration_repo.save(session)
            
            # Perform migration
            result = self.migration_service.merge_local_data(user_id, local_data)
            
            # Update session
            session.status = MigrationStatus.COMPLETED
            session.migration_result = result
            session.completed_at = datetime.now()
            self.migration_repo.save(session)
            
            # Publish event
            event = MigrationCompleted(
                event_id=generate_id(),
                timestamp=datetime.now(),
                event_type="MigrationCompleted",
                session_id=session.session_id,
                user_id=user_id,
                migrated_items=result.get('merged', 0)
            )
            self.event_publisher.publish(event)
            
            return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Analytics Methods
    def get_user_activity_metrics(self) -> Dict[str, Any]:
        """Get basic user activity metrics."""
        # Simple implementation - count unique users from sessions
        all_sessions = []  # Would need to implement find_all in session repo
        daily_active = len(set(s.user_id for s in all_sessions if 
                             s.created_at.date() == datetime.now().date()))
        
        return {
            "daily_active_users": daily_active,
            "total_users": len(set(s.user_id for s in all_sessions))
        }
    
    def get_vocabulary_analytics(self) -> List[Dict[str, Any]]:
        """Get vocabulary usage analytics."""
        analytics = self.analytics_repo.find_all_vocabulary_analytics()
        return [
            {
                "word_id": a.word_id,
                "total_reviews": a.total_reviews,
                "accuracy_rate": a.accuracy_rate
            }
            for a in analytics
        ]