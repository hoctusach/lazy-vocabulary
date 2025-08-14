import uuid
from typing import List
from datetime import datetime
from ..domain.entities.review_event import ReviewEvent
from ..domain.entities.user_progress import UserProgress
from ..domain.repositories.user_progress_repository import UserProgressRepository
from ..domain.repositories.review_event_repository import ReviewEventRepository
from ..domain.services.srs_algorithm_service import SRSAlgorithmService
from ..domain.value_objects.user_id import UserId
from ..domain.value_objects.progress_id import ProgressId
from ..domain.value_objects.srs_data import SRSData, ReviewResponse

class ReviewEventProcessingService:
    def __init__(self, 
                 progress_repo: UserProgressRepository,
                 event_repo: ReviewEventRepository,
                 srs_service: SRSAlgorithmService):
        self.progress_repo = progress_repo
        self.event_repo = event_repo
        self.srs_service = srs_service
    
    def process_review_event(self, user_id: UserId, word_id: str, response: ReviewResponse, response_time: int) -> None:
        # Create review event
        event = ReviewEvent(
            event_id=str(uuid.uuid4()),
            user_id=user_id,
            word_id=word_id,
            response=response,
            response_time=response_time
        )
        
        # Save event
        self.event_repo.save(event)
        
        # Get or create user progress
        progress = self.progress_repo.find_by_user_and_word(user_id, word_id)
        if progress is None:
            progress = UserProgress(
                progress_id=ProgressId.generate(),
                user_id=user_id,
                word_id=word_id,
                srs_data=SRSData(interval=1, ease_factor=2.5, repetitions=0)
            )
        
        # Update progress using SRS algorithm
        updated_progress = self.srs_service.update_progress(progress, event)
        
        # Save updated progress
        self.progress_repo.save(updated_progress)