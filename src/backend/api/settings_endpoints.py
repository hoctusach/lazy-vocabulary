from fastapi import APIRouter, Depends
from ..models.user_settings import UserSettings, SpeechSettings, TranslationSettings
from ..services.settings_service import SettingsService

router = APIRouter(prefix="/api/settings", tags=["settings"])

settings_service_instance = SettingsService()

def get_settings_service() -> SettingsService:
    return settings_service_instance

@router.get("/{user_id}", response_model=UserSettings)
async def get_user_settings(
    user_id: str,
    service: SettingsService = Depends(get_settings_service)
):
    return service.get_user_settings(user_id)

@router.put("/speech", response_model=SpeechSettings)
async def update_speech_settings(
    settings: SpeechSettings,
    service: SettingsService = Depends(get_settings_service)
):
    return service.update_speech_settings(settings)

@router.put("/translation", response_model=TranslationSettings)
async def update_translation_settings(
    settings: TranslationSettings,
    service: SettingsService = Depends(get_settings_service)
):
    return service.update_translation_settings(settings)