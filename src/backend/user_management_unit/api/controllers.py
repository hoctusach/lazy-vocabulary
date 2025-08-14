"""API controllers for User Management."""
from typing import Dict, Any, Optional
import json

from domain.value_objects import Email, DeviceInfo, SessionId
from application.auth_service import AuthenticationService
from application.registration_service import UserRegistrationApplicationService
from api.models import RegisterRequest, LoginRequest, ValidateSessionRequest, LogoutRequest


class AuthController:
    def __init__(
        self,
        auth_service: AuthenticationService,
        registration_service: UserRegistrationApplicationService
    ):
        self.auth_service = auth_service
        self.registration_service = registration_service
    
    def register(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user registration."""
        try:
            req = RegisterRequest(**request_data)
            result = self.registration_service.register_user(
                req.email, req.nickname, req.password
            )
            return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def login(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user login."""
        try:
            req = LoginRequest(**request_data)
            email = Email(req.email)
            device_info = DeviceInfo(
                device_type=req.device_type,
                user_agent=req.user_agent,
                ip_address=req.ip_address
            )
            
            result = self.auth_service.authenticate(email, req.password, device_info)
            if result:
                return {"success": True, "data": result}
            else:
                return {"success": False, "error": "Invalid credentials"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_session(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate user session."""
        try:
            req = ValidateSessionRequest(**request_data)
            result = self.auth_service.validate_session(req.token)
            if result:
                return {"success": True, "data": result}
            else:
                return {"success": False, "error": "Invalid session"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def logout(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user logout."""
        try:
            req = LogoutRequest(**request_data)
            session_id = SessionId(req.session_id)
            self.auth_service.logout(session_id)
            return {"success": True, "message": "Logged out successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}