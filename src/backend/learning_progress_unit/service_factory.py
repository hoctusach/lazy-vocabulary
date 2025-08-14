from .domain.services.srs_algorithm_service import SRSAlgorithmService
from .application.review_event_processing_service import ReviewEventProcessingService
from .application.daily_list_generation_service import DailyListGenerationService
from .infrastructure.in_memory_user_progress_repository import InMemoryUserProgressRepository
from .infrastructure.in_memory_review_event_repository import InMemoryReviewEventRepository
from .api.progress_controller import ProgressController

class LearningProgressServiceFactory:
    def __init__(self):
        # Infrastructure
        self.progress_repo = InMemoryUserProgressRepository()
        self.event_repo = InMemoryReviewEventRepository()
        
        # Domain services
        self.srs_service = SRSAlgorithmService()
        
        # Application services
        self.review_service = ReviewEventProcessingService(
            self.progress_repo, self.event_repo, self.srs_service
        )
        self.daily_list_service = DailyListGenerationService(self.progress_repo)
        
        # API
        self.controller = ProgressController(self.review_service, self.daily_list_service)
    
    def get_controller(self) -> ProgressController:
        return self.controller