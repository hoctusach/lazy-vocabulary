from typing import Dict, List, Any

class MemoryStore:
    def __init__(self):
        self.users: Dict[str, Dict] = {}
        self.sessions: Dict[str, Dict] = {}
        self.learning_progress: Dict[str, Dict] = {}
        self.daily_selections: Dict[str, Dict] = {}
        self.speech_settings: Dict[str, Dict] = {}
        self.translation_settings: Dict[str, Dict] = {}
        self.custom_words: Dict[str, List] = {}
        self.daily_usage: Dict[str, Dict] = {}
        self.stickers: Dict[str, List] = {}
        self.streak_days: Dict[str, List] = {}
        self.badges: Dict[str, List] = {}
        self.word_counts: Dict[str, Dict] = {}
        self.user_sessions: Dict[str, Dict] = {}
        self.last_word_positions: Dict[str, Dict] = {}

memory_store = MemoryStore()