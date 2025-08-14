"""API controllers for Cognito-based User Management."""
from typing import Dict, Any

from domain.value_objects import Email, Nickname, DeviceInfo, SessionId
from application.cognito_auth_service import CognitoAuthenticationService
from api.models import RegisterRequest, LoginRequest, ValidateSessionRequest, LogoutRequest


class CognitoAuthController:
    def __init__(self, cognito_auth_service: CognitoAuthenticationService):
        self.cognito_auth_service = cognito_auth_service
    
    def register(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user registration with Cognito."""
        try:
            req = RegisterRequest(**request_data)
            email = Email(req.email)
            nickname = Nickname(req.nickname)
            
            result = self.cognito_auth_service.register(email, nickname, req.password)
            return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def login(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user login with Cognito."""
        try:
            req = LoginRequest(**request_data)
            email = Email(req.email)
            device_info = DeviceInfo(
                device_type=req.device_type,
                user_agent=req.user_agent,
                ip_address=req.ip_address
            )
            
            result = self.cognito_auth_service.authenticate(email, req.password, device_info)
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
            result = self.cognito_auth_service.validate_session(req.token)
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
            self.cognito_auth_service.logout(session_id)
            return {"success": True, "message": "Logged out successfully"}
        except Exception as e:
            return {"success": False, "error": str(e)}