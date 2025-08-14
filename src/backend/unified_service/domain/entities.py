"""
Unified domain entities for the Lazy Vocabulary backend service.
Consolidates entities from all five original units.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum


class MigrationStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class User:
    """User entity from user management unit."""
    user_id: str
    email: str
    nickname: str
    password_hash: str
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True


@dataclass
class UserSession:
    """User session entity from user management unit."""
    session_id: str
    user_id: str
    device_info: str
    expires_at: datetime
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True


@dataclass
class VocabularyWord:
    """Vocabulary word entity from vocabulary service unit."""
    word_id: str
    word_text: str
    meaning: str
    category_id: str
    example: Optional[str] = None
    translation: Optional[str] = None
    audio_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Category:
    """Category entity from vocabulary service unit."""
    category_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class UserProgress:
    """User progress entity from learning progress unit."""
    progress_id: str
    user_id: str
    word_id: str
    next_review_date: datetime
    interval_days: int = 1
    ease_factor: float = 2.5
    repetitions: int = 0
    last_reviewed: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ReviewEvent:
    """Review event entity from learning progress unit."""
    event_id: str
    user_id: str
    word_id: str
    response_accuracy: bool
    response_time_ms: int
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class MigrationSession:
    """Migration session entity from data migration unit."""
    session_id: str
    user_id: str
    status: MigrationStatus
    local_data_snapshot: Dict[str, Any]
    migration_result: Optional[Dict[str, Any]] = None
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


@dataclass
class UserActivityMetrics:
    """User activity metrics entity from analytics unit."""
    metrics_id: str
    date: datetime
    daily_active_users: int = 0
    weekly_active_users: int = 0
    monthly_active_users: int = 0
    total_reviews: int = 0
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class VocabularyAnalytics:
    """Vocabulary analytics entity from analytics unit."""
    analytics_id: str
    word_id: str
    total_reviews: int = 0
    correct_reviews: int = 0
    accuracy_rate: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)