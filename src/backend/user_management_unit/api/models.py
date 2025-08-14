"""API request/response models."""
from dataclasses import dataclass
from datetime import datetime
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
    token: str
    expires_at: datetime


@dataclass
class LoginRequest:
    email: str
    password: str
    device_type: str = "web"
    user_agent: str = ""
    ip_address: str = "127.0.0.1"


@dataclass
class LoginResponse:
    user_id: str
    session_id: str
    token: str
    expires_at: datetime


@dataclass
class ValidateSessionRequest:
    token: str


@dataclass
class ValidateSessionResponse:
    user_id: str
    session_id: str
    is_valid: bool


@dataclass
class LogoutRequest:
    session_id: str