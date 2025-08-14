from datetime import datetime, timedelta
from ..entities.user_progress import UserProgress
from ..entities.review_event import ReviewEvent
from ..value_objects.srs_data import SRSData, ReviewResponse

class SRSAlgorithmService:
    def update_progress(self, progress: UserProgress, event: ReviewEvent) -> UserProgress:
        """Update user progress based on review event"""
        new_srs_data = self.calculate_next_review(progress.srs_data, event.response)
        
        # Update counters
        new_total_reviews = progress.total_reviews + 1
        new_correct_reviews = progress.correct_reviews + (1 if event.response.is_correct else 0)
        
        # Calculate next review date
        next_review_at = datetime.now() + timedelta(days=new_srs_data.interval)
        
        return UserProgress(
            progress_id=progress.progress_id,
            user_id=progress.user_id,
            word_id=progress.word_id,
            srs_data=new_srs_data,
            total_reviews=new_total_reviews,
            correct_reviews=new_correct_reviews,
            last_reviewed_at=event.occurred_at,
            next_review_at=next_review_at,
            created_at=progress.created_at
        )
    
    def calculate_next_review(self, srs_data: SRSData, response: ReviewResponse) -> SRSData:
        """Calculate next SRS data based on response"""
        new_interval = srs_data.calculate_next_interval(response)
        new_ease_factor = srs_data.update_ease_factor(response)
        new_repetitions = srs_data.repetitions + 1 if response.is_correct else 0
        
        return SRSData(
            interval=new_interval,
            ease_factor=new_ease_factor,
            repetitions=new_repetitions
        )