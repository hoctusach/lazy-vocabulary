from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class User(BaseModel):
    user_id: str
    email: str
    nickname: str
    created_at: datetime = Field(default_factory=datetime.now)

class Session(BaseModel):
    session_id: str
    user_id: str
    token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.now)

class LoginRequest(BaseModel):
    email: str
    nickname: str

class LoginResponse(BaseModel):
    user: User
    session: Session