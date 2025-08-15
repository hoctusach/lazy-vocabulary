from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class UserSession(BaseModel):
    user_id: str
    session_id: str
    speech_unlocked: bool = Field(default=False)
    current_displayed_word: Optional[str] = None
    current_text_being_spoken: Optional[str] = None
    last_activity: datetime = Field(default_factory=datetime.now)

class NotificationSubscription(BaseModel):
    user_id: str
    subscription_data: dict
    created_at: datetime = Field(default_factory=datetime.now)

class LastWordPosition(BaseModel):
    user_id: str
    category: str
    last_word: str
    updated_at: datetime = Field(default_factory=datetime.now)