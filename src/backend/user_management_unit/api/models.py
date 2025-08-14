from dataclasses import dataclass
from typing import Optional

@dataclass
class RegisterRequest:
    email: str
    nickname: str
    password: str

@dataclass
class RegisterResponse:
    user_id: str
    email: str
    nickname: str
    success: bool

@dataclass
class LoginRequest:
    email: str
    password: str
    device_type: str = "web"

@dataclass
class LoginResponse:
    user_id: str
    session_id: str
    success: bool

@dataclass
class ValidateSessionRequest:
    session_id: str

@dataclass
class ValidateSessionResponse:
    is_valid: bool
    user_id: Optional[str] = None