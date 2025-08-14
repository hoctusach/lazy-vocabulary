from typing import List, Dict
from datetime import datetime
from ..domain.repositories.user_progress_repository import UserProgressRepository
from ..domain.value_objects.user_id import UserId

class DailyListGenerationService:
    def __init__(self, progress_repo: UserProgressRepository):
        self.progress_repo = progress_repo
    
    def generate_daily_list(self, user_id: UserId, max_new_words: int = 10, max_review_words: int = 50) -> Dict[str, List[str]]:
        """Generate daily list of words for review and new learning"""
        
        # Get words due for review
        due_words = self.progress_repo.find_due_for_review(user_id, datetime.now())
        review_words = [progress.word_id for progress in due_words[:max_review_words]]
        
        # For demo purposes, simulate new words (in real app, this would come from vocabulary service)
        all_progress = self.progress_repo.find_by_user(user_id)
        learned_word_ids = {progress.word_id for progress in all_progress}
        
        # Simulate available vocabulary (in real app, this would be fetched from vocabulary service)
        available_words = [f"word_{i}" for i in range(1, 101)]
        new_words = [word for word in available_words if word not in learned_word_ids][:max_new_words]
        
        return {
            "review_words": review_words,
            "new_words": new_words,
            "generated_at": datetime.now().isoformat()
        }