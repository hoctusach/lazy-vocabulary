"""
In-memory repository implementations for the unified Lazy Vocabulary backend service.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime

from domain.entities import (
    User, UserSession, VocabularyWord, Category, UserProgress, 
    ReviewEvent, MigrationSession, UserActivityMetrics, VocabularyAnalytics
)
from domain.repositories import (
    UserRepository, SessionRepository, VocabularyRepository, CategoryRepository,
    UserProgressRepository, ReviewEventRepository, MigrationSessionRepository, AnalyticsRepository
)


class InMemoryUserRepository(UserRepository):
    """In-memory implementation of UserRepository."""
    
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.email_index: Dict[str, str] = {}  # email -> user_id
    
    def save(self, user: User) -> None:
        self.users[user.user_id] = user
        self.email_index[user.email] = user.user_id
    
    def find_by_id(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)
    
    def find_by_email(self, email: str) -> Optional[User]:
        user_id = self.email_index.get(email)
        return self.users.get(user_id) if user_id else None
    
    def exists_by_email(self, email: str) -> bool:
        return email in self.email_index


class InMemorySessionRepository(SessionRepository):
    """In-memory implementation of SessionRepository."""
    
    def __init__(self):
        self.sessions: Dict[str, UserSession] = {}
        self.user_sessions: Dict[str, List[str]] = {}  # user_id -> [session_ids]
    
    def save(self, session: UserSession) -> None:
        self.sessions[session.session_id] = session
        if session.user_id not in self.user_sessions:
            self.user_sessions[session.user_id] = []
        if session.session_id not in self.user_sessions[session.user_id]:
            self.user_sessions[session.user_id].append(session.session_id)
    
    def find_by_id(self, session_id: str) -> Optional[UserSession]:
        return self.sessions.get(session_id)
    
    def find_active_by_user_id(self, user_id: str) -> List[UserSession]:
        session_ids = self.user_sessions.get(user_id, [])
        return [
            self.sessions[sid] for sid in session_ids 
            if sid in self.sessions and self.sessions[sid].is_active
        ]
    
    def expire_session(self, session_id: str) -> None:
        if session_id in self.sessions:
            self.sessions[session_id].is_active = False


class InMemoryVocabularyRepository(VocabularyRepository):
    """In-memory implementation of VocabularyRepository."""
    
    def __init__(self):
        self.words: Dict[str, VocabularyWord] = {}
        self.category_index: Dict[str, List[str]] = {}  # category_id -> [word_ids]
    
    def save(self, word: VocabularyWord) -> None:
        self.words[word.word_id] = word
        if word.category_id not in self.category_index:
            self.category_index[word.category_id] = []
        if word.word_id not in self.category_index[word.category_id]:
            self.category_index[word.category_id].append(word.word_id)
    
    def find_by_id(self, word_id: str) -> Optional[VocabularyWord]:
        return self.words.get(word_id)
    
    def find_by_category(self, category_id: str) -> List[VocabularyWord]:
        word_ids = self.category_index.get(category_id, [])
        return [self.words[wid] for wid in word_ids if wid in self.words]
    
    def search(self, query: str) -> List[VocabularyWord]:
        query_lower = query.lower()
        results = []
        for word in self.words.values():
            if (query_lower in word.word_text.lower() or
                query_lower in word.meaning.lower() or
                (word.example and query_lower in word.example.lower()) or
                (word.translation and query_lower in word.translation.lower())):
                results.append(word)
        return results
    
    def find_all(self) -> List[VocabularyWord]:
        return list(self.words.values())


class InMemoryCategoryRepository(CategoryRepository):
    """In-memory implementation of CategoryRepository."""
    
    def __init__(self):
        self.categories: Dict[str, Category] = {}
        self.name_index: Dict[str, str] = {}  # name -> category_id
    
    def save(self, category: Category) -> None:
        self.categories[category.category_id] = category
        self.name_index[category.name] = category.category_id
    
    def find_by_id(self, category_id: str) -> Optional[Category]:
        return self.categories.get(category_id)
    
    def find_by_name(self, name: str) -> Optional[Category]:
        category_id = self.name_index.get(name)
        return self.categories.get(category_id) if category_id else None
    
    def find_all(self) -> List[Category]:
        return list(self.categories.values())


class InMemoryUserProgressRepository(UserProgressRepository):
    """In-memory implementation of UserProgressRepository."""
    
    def __init__(self):
        self.progress: Dict[str, UserProgress] = {}
        self.user_progress: Dict[str, List[str]] = {}  # user_id -> [progress_ids]
        self.user_word_index: Dict[str, str] = {}  # f"{user_id}:{word_id}" -> progress_id
    
    def save(self, progress: UserProgress) -> None:
        self.progress[progress.progress_id] = progress
        
        # Update user index
        if progress.user_id not in self.user_progress:
            self.user_progress[progress.user_id] = []
        if progress.progress_id not in self.user_progress[progress.user_id]:
            self.user_progress[progress.user_id].append(progress.progress_id)
        
        # Update user-word index
        key = f"{progress.user_id}:{progress.word_id}"
        self.user_word_index[key] = progress.progress_id
    
    def find_by_user_and_word(self, user_id: str, word_id: str) -> Optional[UserProgress]:
        key = f"{user_id}:{word_id}"
        progress_id = self.user_word_index.get(key)
        return self.progress.get(progress_id) if progress_id else None
    
    def find_by_user_id(self, user_id: str) -> List[UserProgress]:
        progress_ids = self.user_progress.get(user_id, [])
        return [self.progress[pid] for pid in progress_ids if pid in self.progress]
    
    def find_due_for_review(self, user_id: str, date: datetime) -> List[UserProgress]:
        user_progress_list = self.find_by_user_id(user_id)
        return [p for p in user_progress_list if p.next_review_date <= date]


class InMemoryReviewEventRepository(ReviewEventRepository):
    """In-memory implementation of ReviewEventRepository."""
    
    def __init__(self):
        self.events: Dict[str, ReviewEvent] = {}
        self.user_events: Dict[str, List[str]] = {}  # user_id -> [event_ids]
        self.word_events: Dict[str, List[str]] = {}  # word_id -> [event_ids]
    
    def save(self, event: ReviewEvent) -> None:
        self.events[event.event_id] = event
        
        # Update user index
        if event.user_id not in self.user_events:
            self.user_events[event.user_id] = []
        self.user_events[event.user_id].append(event.event_id)
        
        # Update word index
        if event.word_id not in self.word_events:
            self.word_events[event.word_id] = []
        self.word_events[event.word_id].append(event.event_id)
    
    def find_by_user_id(self, user_id: str) -> List[ReviewEvent]:
        event_ids = self.user_events.get(user_id, [])
        return [self.events[eid] for eid in event_ids if eid in self.events]
    
    def find_by_word_id(self, word_id: str) -> List[ReviewEvent]:
        event_ids = self.word_events.get(word_id, [])
        return [self.events[eid] for eid in event_ids if eid in self.events]
    
    def find_by_date_range(self, start_date: datetime, end_date: datetime) -> List[ReviewEvent]:
        return [
            event for event in self.events.values()
            if start_date <= event.timestamp <= end_date
        ]


class InMemoryMigrationSessionRepository(MigrationSessionRepository):
    """In-memory implementation of MigrationSessionRepository."""
    
    def __init__(self):
        self.sessions: Dict[str, MigrationSession] = {}
        self.user_sessions: Dict[str, List[str]] = {}  # user_id -> [session_ids]
    
    def save(self, session: MigrationSession) -> None:
        self.sessions[session.session_id] = session
        if session.user_id not in self.user_sessions:
            self.user_sessions[session.user_id] = []
        if session.session_id not in self.user_sessions[session.user_id]:
            self.user_sessions[session.user_id].append(session.session_id)
    
    def find_by_id(self, session_id: str) -> Optional[MigrationSession]:
        return self.sessions.get(session_id)
    
    def find_by_user_id(self, user_id: str) -> List[MigrationSession]:
        session_ids = self.user_sessions.get(user_id, [])
        return [self.sessions[sid] for sid in session_ids if sid in self.sessions]


class InMemoryAnalyticsRepository(AnalyticsRepository):
    """In-memory implementation of AnalyticsRepository."""
    
    def __init__(self):
        self.user_activity_metrics: Dict[str, UserActivityMetrics] = {}
        self.vocabulary_analytics: Dict[str, VocabularyAnalytics] = {}
        self.date_index: Dict[str, str] = {}  # date_str -> metrics_id
        self.word_analytics_index: Dict[str, str] = {}  # word_id -> analytics_id
    
    def save_user_activity_metrics(self, metrics: UserActivityMetrics) -> None:
        self.user_activity_metrics[metrics.metrics_id] = metrics
        date_str = metrics.date.strftime('%Y-%m-%d')
        self.date_index[date_str] = metrics.metrics_id
    
    def save_vocabulary_analytics(self, analytics: VocabularyAnalytics) -> None:
        self.vocabulary_analytics[analytics.analytics_id] = analytics
        self.word_analytics_index[analytics.word_id] = analytics.analytics_id
    
    def find_user_activity_by_date(self, date: datetime) -> Optional[UserActivityMetrics]:
        date_str = date.strftime('%Y-%m-%d')
        metrics_id = self.date_index.get(date_str)
        return self.user_activity_metrics.get(metrics_id) if metrics_id else None
    
    def find_vocabulary_analytics_by_word(self, word_id: str) -> Optional[VocabularyAnalytics]:
        analytics_id = self.word_analytics_index.get(word_id)
        return self.vocabulary_analytics.get(analytics_id) if analytics_id else None
    
    def find_all_vocabulary_analytics(self) -> List[VocabularyAnalytics]:
        return list(self.vocabulary_analytics.values())