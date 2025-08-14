from dataclasses import dataclass
from datetime import datetime
from ..value_objects.identifiers import AnalyticsId
from ..value_objects.analytics_data import ReviewMetrics, AccuracyMetrics

@dataclass
class VocabularyAnalytics:
    analytics_id: AnalyticsId
    word_id: str
    category_id: str
    review_metrics: ReviewMetrics
    accuracy_metrics: AccuracyMetrics
    popularity_score: float = 0.0
    last_updated_at: datetime = None
    
    def __post_init__(self):
        if self.last_updated_at is None:
            self.last_updated_at = datetime.now()
    
    def update_from_review(self, is_correct: bool, response_time: int):
        """Update analytics from a single review event"""
        new_total = self.review_metrics.total_reviews + 1
        new_correct = self.accuracy_metrics.correct_reviews + (1 if is_correct else 0)
        
        # Update response time (simple average)
        old_avg = self.review_metrics.average_response_time
        new_avg = ((old_avg * (new_total - 1)) + response_time) // new_total
        
        self.review_metrics = ReviewMetrics(
            total_reviews=new_total,
            unique_users=self.review_metrics.unique_users,  # Would need user tracking
            average_response_time=new_avg
        )
        
        self.accuracy_metrics = AccuracyMetrics(
            correct_reviews=new_correct,
            total_reviews=new_total
        )
        
        # Update popularity score based on review frequency
        self.popularity_score = self.review_metrics.get_review_frequency()
        self.last_updated_at = datetime.now()