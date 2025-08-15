from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class SpeechSettings(BaseModel):
    user_id: str
    preferred_voice_name: Optional[str] = None
    speech_rate: float = Field(default=1.0)
    is_muted: bool = Field(default=False)
    voice_region: str = Field(default="US")
    preserve_special: bool = Field(default=False)

class TranslationSettings(BaseModel):
    user_id: str
    translation_lang: str = Field(default="")

class UserSettings(BaseModel):
    user_id: str
    speech_settings: SpeechSettings
    translation_settings: TranslationSettings
    button_states: Dict[str, Any] = Field(default_factory=dict)