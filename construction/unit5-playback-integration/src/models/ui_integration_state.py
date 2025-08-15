from dataclasses import dataclass
from enum import Enum
from typing import Optional

class ButtonType(Enum):
    NEXT = "NEXT"
    PAUSE = "PAUSE"
    PLAY = "PLAY"
    MUTE = "MUTE"
    VOICE = "VOICE"
    CATEGORY = "CATEGORY"
    RETIRE = "RETIRE"

@dataclass
class UIIntegrationState:
    current_word: Optional[dict] = None
    is_audio_playing: bool = False
    is_paused: bool = False
    is_muted: bool = False
    auto_advance_enabled: bool = True
    last_button_interaction: str = ""
    integration_active: bool = False

@dataclass
class ButtonInteraction:
    button_type: ButtonType
    timestamp: str
    word_key: str
    resulting_action: str
    success: bool