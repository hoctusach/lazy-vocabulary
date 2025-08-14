"""
Unified domain events for the Lazy Vocabulary backend service.
Consolidates events from all five original units.
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Any


@dataclass
class DomainEvent:
    """Base domain event."""
    event_id: str
    timestamp: datetime
    event_type: str


# User Management Events
@dataclass
class UserRegistered(DomainEvent):
    """Event published when a user registers."""
    user_id: str
    email: str
    nickname: str


@dataclass
class UserLoggedIn(DomainEvent):
    """Event published when a user logs in."""
    user_id: str
    session_id: str
    device_info: str


@dataclass
class SessionExpired(DomainEvent):
    """Event published when a session expires."""
    session_id: str
    user_id: str


# Vocabulary Service Events
@dataclass
class VocabularyWordAdded(DomainEvent):
    """Event published when a vocabulary word is added."""
    word_id: str
    word_text: str
    category_id: str


@dataclass
class CategoryCreated(DomainEvent):
    """Event published when a category is created."""
    category_id: str
    category_name: str


# Learning Progress Events
@dataclass
class ReviewEventRecorded(DomainEvent):
    """Event published when a review event is recorded."""
    user_id: str
    word_id: str
    response_accuracy: bool
    response_time_ms: int


@dataclass
class ProgressUpdated(DomainEvent):
    """Event published when user progress is updated."""
    user_id: str
    word_id: str
    next_review_date: datetime
    interval_days: int


# Data Migration Events
@dataclass
class LocalDataDetected(DomainEvent):
    """Event published when local data is detected."""
    user_id: str
    data_size: int


@dataclass
class MigrationStarted(DomainEvent):
    """Event published when migration starts."""
    session_id: str
    user_id: str


@dataclass
class MigrationCompleted(DomainEvent):
    """Event published when migration completes."""
    session_id: str
    user_id: str
    migrated_items: int


# Analytics Events
@dataclass
class UserActivityRecorded(DomainEvent):
    """Event published when user activity is recorded."""
    user_id: str
    activity_type: str


@dataclass
class VocabularyAnalyticsUpdated(DomainEvent):
    """Event published when vocabulary analytics are updated."""
    word_id: str
    total_reviews: int
    accuracy_rate: float