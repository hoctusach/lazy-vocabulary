from fastapi import APIRouter, Depends, HTTPException
from ..models.learning_progress import LearningProgress, LearningProgressUpdate, LearningProgressStats
from ..models.daily_selection import DailySelection, DailySelectionRequest
from ..services.learning_progress_service import LearningProgressService
from ..services.daily_selection_service import DailySelectionService

router = APIRouter(prefix="/api/learning", tags=["learning"])

# Global service instances
learning_service_instance = LearningProgressService()
daily_service_instance = DailySelectionService(learning_service_instance)

def get_learning_service() -> LearningProgressService:
    return learning_service_instance

def get_daily_service() -> DailySelectionService:
    return daily_service_instance

@router.get("/progress/{user_id}/stats", response_model=LearningProgressStats)
async def get_progress_stats(
    user_id: str,
    service: LearningProgressService = Depends(get_learning_service)
):
    return service.get_stats(user_id)

@router.get("/progress/{user_id}/word/{word}", response_model=LearningProgress)
async def get_word_progress(
    user_id: str,
    word: str,
    service: LearningProgressService = Depends(get_learning_service)
):
    progress = service.get_progress(user_id, word)
    if not progress:
        raise HTTPException(status_code=404, detail="Word progress not found")
    return progress

@router.post("/progress/update", response_model=LearningProgress)
async def update_word_progress(
    update: LearningProgressUpdate,
    service: LearningProgressService = Depends(get_learning_service)
):
    return service.update_word_progress(update.user_id, update.word)

@router.post("/progress/{user_id}/retire/{word}", response_model=LearningProgress)
async def retire_word(
    user_id: str,
    word: str,
    service: LearningProgressService = Depends(get_learning_service)
):
    return service.retire_word(user_id, word)

@router.get("/daily-selection/{user_id}", response_model=DailySelection)
async def get_daily_selection(
    user_id: str,
    severity: str = "moderate",
    service: DailySelectionService = Depends(get_daily_service)
):
    from ..models.daily_selection import SeverityLevel
    severity_level = SeverityLevel(severity)
    return service.get_daily_selection(user_id, severity_level)

@router.post("/daily-selection/generate", response_model=DailySelection)
async def generate_daily_selection(
    request: DailySelectionRequest,
    service: DailySelectionService = Depends(get_daily_service)
):
    return service.generate_daily_selection(request.user_id, request.severity)