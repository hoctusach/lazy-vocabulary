from datetime import date, datetime
from typing import List
from ..models.usage_tracking import DailyUsage, Sticker, StreakDay, Badge, WordCount
from ..storage.memory_store import memory_store

class TrackingService:
    def __init__(self):
        self.store = memory_store
    
    def update_daily_usage(self, user_id: str, time_ms: int) -> DailyUsage:
        """Update daily usage time"""
        today = date.today()
        date_key = today.isoformat()
        
        if user_id not in self.store.daily_usage:
            self.store.daily_usage[user_id] = {}
        
        if date_key in self.store.daily_usage[user_id]:
            usage_data = self.store.daily_usage[user_id][date_key]
            usage_data['total_time_ms'] += time_ms
            usage_data['session_count'] += 1
        else:
            usage_data = {
                'user_id': user_id,
                'usage_date': date_key,
                'total_time_ms': time_ms,
                'session_count': 1
            }
            self.store.daily_usage[user_id][date_key] = usage_data
        
        return DailyUsage(**usage_data)
    
    def get_stickers(self, user_id: str) -> List[Sticker]:
        """Get user stickers"""
        stickers_data = self.store.stickers.get(user_id, [])
        return [Sticker(**sticker) for sticker in stickers_data]
    
    def add_sticker(self, user_id: str, sticker_date: date) -> Sticker:
        """Add sticker for date"""
        sticker = Sticker(user_id=user_id, sticker_date=sticker_date)
        if user_id not in self.store.stickers:
            self.store.stickers[user_id] = []
        self.store.stickers[user_id].append(sticker.dict())
        return sticker
    
    def get_streak_days(self, user_id: str) -> List[StreakDay]:
        """Get streak days"""
        streak_data = self.store.streak_days.get(user_id, [])
        return [StreakDay(**day) for day in streak_data]
    
    def add_streak_day(self, user_id: str, streak_date: date) -> StreakDay:
        """Add streak day"""
        streak = StreakDay(user_id=user_id, streak_date=streak_date)
        if user_id not in self.store.streak_days:
            self.store.streak_days[user_id] = []
        self.store.streak_days[user_id].append(streak.dict())
        return streak
    
    def get_badges(self, user_id: str) -> List[Badge]:
        """Get user badges"""
        badges_data = self.store.badges.get(user_id, [])
        return [Badge(**badge) for badge in badges_data]
    
    def award_badge(self, user_id: str, badge_key: str) -> Badge:
        """Award badge"""
        badge = Badge(user_id=user_id, badge_key=badge_key)
        if user_id not in self.store.badges:
            self.store.badges[user_id] = []
        self.store.badges[user_id].append(badge.dict())
        return badge
    
    def get_word_counts(self, user_id: str) -> List[WordCount]:
        """Get word exposure counts"""
        counts_data = self.store.word_counts.get(user_id, {})
        return [WordCount(**count) for count in counts_data.values()]
    
    def increment_word_count(self, user_id: str, word: str, category: str) -> WordCount:
        """Increment word count"""
        if user_id not in self.store.word_counts:
            self.store.word_counts[user_id] = {}
        
        key = f"{word}_{category}"
        if key in self.store.word_counts[user_id]:
            count_data = self.store.word_counts[user_id][key]
            count_data['count'] += 1
            count_data['last_shown'] = datetime.now().isoformat()
        else:
            count_data = {
                'user_id': user_id,
                'word': word,
                'category': category,
                'count': 1,
                'last_shown': datetime.now().isoformat()
            }
            self.store.word_counts[user_id][key] = count_data
        
        return WordCount(**count_data)