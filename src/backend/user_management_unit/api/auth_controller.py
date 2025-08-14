from typing import Dict, Any
from ..application.user_management_facade import UserManagementFacade
from .models import RegisterRequest, RegisterResponse, LoginRequest, LoginResponse, ValidateSessionRequest, ValidateSessionResponse

class AuthController:
    def __init__(self, facade: UserManagementFacade):
        self.facade = facade
    
    def register(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            request = RegisterRequest(**request_data)
            user = self.facade.register_user(request.email, request.nickname, request.password)
            
            response = RegisterResponse(
                user_id=user.user_id.value,
                email=user.email.value,
                nickname=user.nickname.value,
                success=True
            )
            return {"success": True, "data": response.__dict__}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def login(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            request = LoginRequest(**request_data)
            session = self.facade.login(request.email, request.password, request.device_type)
            
            if session:
                response = LoginResponse(
                    user_id=session.user_id.value,
                    session_id=session.session_id.value,
                    success=True
                )
                return {"success": True, "data": response.__dict__}
            else:
                return {"success": False, "error": "Invalid credentials"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_session(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            request = ValidateSessionRequest(**request_data)
            is_valid = self.facade.validate_session(request.session_id)
            
            response = ValidateSessionResponse(is_valid=is_valid)
            return {"success": True, "data": response.__dict__}
        except Exception as e:
            return {"success": False, "error": str(e)}