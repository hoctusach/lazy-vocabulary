"""
Unified repository interfaces for the Lazy Vocabulary backend service.
Consolidates repository interfaces from all five original units.
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime

from domain.entities import (
    User, UserSession, UserProgress, 
    ReviewEvent, MigrationSession, UserActivityMetrics, VocabularyAnalytics
)


class UserRepository(ABC):
    """Repository interface for user management."""
    
    @abstractmethod
    def save(self, user: User) -> None:
        pass
    
    @abstractmethod
    def find_by_id(self, user_id: str) -> Optional[User]:
        pass
    
    @abstractmethod
    def find_by_email(self, email: str) -> Optional[User]:
        pass
    
    @abstractmethod
    def exists_by_email(self, email: str) -> bool:
        pass


class SessionRepository(ABC):
    """Repository interface for session management."""
    
    @abstractmethod
    def save(self, session: UserSession) -> None:
        pass
    
    @abstractmethod
    def find_by_id(self, session_id: str) -> Optional[UserSession]:
        pass
    
    @abstractmethod
    def find_active_by_user_id(self, user_id: str) -> List[UserSession]:
        pass
    
    @abstractmethod
    def expire_session(self, session_id: str) -> None:
        pass





class UserProgressRepository(ABC):
    """Repository interface for user progress management."""
    
    @abstractmethod
    def save(self, progress: UserProgress) -> None:
        pass
    
    @abstractmethod
    def find_by_user_and_word(self, user_id: str, word_id: str) -> Optional[UserProgress]:
        pass
    
    @abstractmethod
    def find_by_user_id(self, user_id: str) -> List[UserProgress]:
        pass
    
    @abstractmethod
    def find_due_for_review(self, user_id: str, date: datetime) -> List[UserProgress]:
        pass


class ReviewEventRepository(ABC):
    """Repository interface for review event management."""
    
    @abstractmethod
    def save(self, event: ReviewEvent) -> None:
        pass
    
    @abstractmethod
    def find_by_user_id(self, user_id: str) -> List[ReviewEvent]:
        pass
    
    @abstractmethod
    def find_by_word_id(self, word_id: str) -> List[ReviewEvent]:
        pass
    
    @abstractmethod
    def find_by_date_range(self, start_date: datetime, end_date: datetime) -> List[ReviewEvent]:
        pass


class MigrationSessionRepository(ABC):
    """Repository interface for migration session management."""
    
    @abstractmethod
    def save(self, session: MigrationSession) -> None:
        pass
    
    @abstractmethod
    def find_by_id(self, session_id: str) -> Optional[MigrationSession]:
        pass
    
    @abstractmethod
    def find_by_user_id(self, user_id: str) -> List[MigrationSession]:
        pass


class AnalyticsRepository(ABC):
    """Repository interface for analytics data management."""
    
    @abstractmethod
    def save_user_activity_metrics(self, metrics: UserActivityMetrics) -> None:
        pass
    
    @abstractmethod
    def save_vocabulary_analytics(self, analytics: VocabularyAnalytics) -> None:
        pass
    
    @abstractmethod
    def find_user_activity_by_date(self, date: datetime) -> Optional[UserActivityMetrics]:
        pass
    
    @abstractmethod
    def find_vocabulary_analytics_by_word(self, word_id: str) -> Optional[VocabularyAnalytics]:
        pass
    
    @abstractmethod
    def find_all_vocabulary_analytics(self) -> List[VocabularyAnalytics]:
        pass