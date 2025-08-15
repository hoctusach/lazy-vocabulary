from datetime import date
from typing import List
import random
from ..models.daily_selection import DailySelection, SeverityLevel, CategoryWeights
from ..models.learning_progress import LearningProgress
from ..storage.memory_store import memory_store

class DailySelectionService:
    def __init__(self, learning_service):
        self.store = memory_store
        self.learning_service = learning_service
        self.severity_config = {
            SeverityLevel.LIGHT: {"min": 15, "max": 25},
            SeverityLevel.MODERATE: {"min": 30, "max": 50},
            SeverityLevel.INTENSE: {"min": 50, "max": 100}
        }
        self.category_weights = CategoryWeights()
    
    def get_daily_selection(self, user_id: str, severity: SeverityLevel = SeverityLevel.MODERATE) -> DailySelection:
        """Get or generate daily selection"""
        today = date.today()
        existing = self._get_cached_selection(user_id, today)
        if existing:
            return existing
        
        return self.generate_daily_selection(user_id, severity)
    
    def generate_daily_selection(self, user_id: str, severity: SeverityLevel = SeverityLevel.MODERATE) -> DailySelection:
        """Generate new daily selection"""
        config = self.severity_config[severity]
        total_count = random.randint(config["min"], config["max"])
        
        # Create mock words for demo
        from ..models.daily_selection import DailySelectionWord
        
        new_words = []
        review_words = []
        
        # Generate mock new words
        for i in range(min(total_count // 2, 20)):
            new_words.append(DailySelectionWord(
                word=f"new_word_{i+1}",
                category="topic vocabulary",
                reviewCount=0
            ))
        
        # Generate mock review words
        for i in range(min(total_count - len(new_words), 15)):
            review_words.append(DailySelectionWord(
                word=f"review_word_{i+1}",
                category="phrasal verbs",
                reviewCount=random.randint(1, 5)
            ))
        
        selection = DailySelection(
            user_id=user_id,
            newWords=new_words,
            reviewWords=review_words,
            totalCount=len(new_words) + len(review_words),
            severity_level=severity
        )
        
        # Cache selection
        self._cache_selection(selection)
        return selection
    
    def _select_new_words_by_category(self, new_words: List[LearningProgress], target_count: int) -> List[LearningProgress]:
        """Select new words proportionally by category"""
        if not new_words or target_count == 0:
            return []
        
        # Group by category
        by_category = {}
        for word in new_words:
            category = word.category
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(word)
        
        selected = []
        weights = self.category_weights.dict()
        
        # Select by category weight
        for category, words in by_category.items():
            weight = weights.get(category.replace(' ', '_'), 0)
            quota = round(target_count * weight)
            shuffled = random.sample(words, min(quota, len(words)))
            selected.extend(shuffled)
        
        # Fill remaining slots
        if len(selected) < target_count:
            remaining = [w for w in new_words if w not in selected]
            additional = random.sample(remaining, min(target_count - len(selected), len(remaining)))
            selected.extend(additional)
        
        return selected[:target_count]
    
    def _get_cached_selection(self, user_id: str, selection_date: date) -> DailySelection:
        """Get cached daily selection"""
        user_selections = self.store.daily_selections.get(user_id, {})
        date_key = selection_date.isoformat()
        if date_key in user_selections:
            return DailySelection(**user_selections[date_key])
        return None
    
    def _cache_selection(self, selection: DailySelection):
        """Cache daily selection in memory"""
        if selection.user_id not in self.store.daily_selections:
            self.store.daily_selections[selection.user_id] = {}
        date_key = selection.selection_date.isoformat()
        self.store.daily_selections[selection.user_id][date_key] = selection.dict()