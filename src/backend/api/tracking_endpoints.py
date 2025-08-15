from fastapi import APIRouter, Depends
from typing import List
from datetime import date
from ..models.usage_tracking import DailyUsage, Sticker, Badge, WordCount
from ..services.tracking_service import TrackingService

router = APIRouter(prefix="/api/tracking", tags=["tracking"])

tracking_service_instance = TrackingService()

def get_tracking_service() -> TrackingService:
    return tracking_service_instance

@router.post("/usage/{user_id}", response_model=DailyUsage)
async def update_daily_usage(
    user_id: str,
    time_ms: int,
    service: TrackingService = Depends(get_tracking_service)
):
    return service.update_daily_usage(user_id, time_ms)

@router.get("/stickers/{user_id}", response_model=List[Sticker])
async def get_stickers(
    user_id: str,
    service: TrackingService = Depends(get_tracking_service)
):
    return service.get_stickers(user_id)

@router.post("/stickers/{user_id}")
async def add_sticker(
    user_id: str,
    sticker_date: date,
    service: TrackingService = Depends(get_tracking_service)
):
    return service.add_sticker(user_id, sticker_date)

@router.get("/badges/{user_id}", response_model=List[Badge])
async def get_badges(
    user_id: str,
    service: TrackingService = Depends(get_tracking_service)
):
    return service.get_badges(user_id)

@router.post("/word-count/{user_id}")
async def increment_word_count(
    user_id: str,
    word: str,
    category: str,
    service: TrackingService = Depends(get_tracking_service)
):
    return service.increment_word_count(user_id, word, category)