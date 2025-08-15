from ..models.user_settings import UserSettings, SpeechSettings, TranslationSettings
from ..storage.memory_store import memory_store

class SettingsService:
    def __init__(self):
        self.store = memory_store
    
    def get_user_settings(self, user_id: str) -> UserSettings:
        """Get all user settings"""
        speech = self.get_speech_settings(user_id)
        translation = self.get_translation_settings(user_id)
        return UserSettings(
            user_id=user_id,
            speech_settings=speech,
            translation_settings=translation
        )
    
    def get_speech_settings(self, user_id: str) -> SpeechSettings:
        """Get speech settings"""
        if user_id in self.store.speech_settings:
            return SpeechSettings(**self.store.speech_settings[user_id])
        return SpeechSettings(user_id=user_id)
    
    def update_speech_settings(self, settings: SpeechSettings) -> SpeechSettings:
        """Update speech settings"""
        self.store.speech_settings[settings.user_id] = settings.dict()
        return settings
    
    def get_translation_settings(self, user_id: str) -> TranslationSettings:
        """Get translation settings"""
        if user_id in self.store.translation_settings:
            return TranslationSettings(**self.store.translation_settings[user_id])
        return TranslationSettings(user_id=user_id)
    
    def update_translation_settings(self, settings: TranslationSettings) -> TranslationSettings:
        """Update translation settings"""
        self.store.translation_settings[settings.user_id] = settings.dict()
        return settings