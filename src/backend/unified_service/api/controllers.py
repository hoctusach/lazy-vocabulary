"""
Unified API controllers for the Lazy Vocabulary backend service.
Consolidates all API endpoints from the five original units.
"""
from typing import Dict, Any, List
from datetime import datetime

from application.unified_service import LazyVocabularyService


class LazyVocabularyController:
    """Unified REST API controller for all Lazy Vocabulary functionality."""
    
    def __init__(self, service: LazyVocabularyService):
        self.service = service
    
    # User Management Endpoints
    def register_user(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """POST /api/users/register"""
        try:
            email = request_data.get('email')
            nickname = request_data.get('nickname')
            password = request_data.get('password')
            
            if not all([email, nickname, password]):
                return {"success": False, "error": "Missing required fields"}
            
            return self.service.register_user(email, nickname, password)
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def login_user(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """POST /api/users/login"""
        try:
            email = request_data.get('email')
            password = request_data.get('password')
            device_info = request_data.get('device_info', 'web')
            
            if not all([email, password]):
                return {"success": False, "error": "Missing email or password"}
            
            return self.service.login_user(email, password, device_info)
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def validate_session(self, session_id: str) -> Dict[str, Any]:
        """GET /api/users/validate/{session_id}"""
        try:
            is_valid = self.service.validate_session(session_id)
            return {"success": True, "data": {"valid": is_valid}}
        except Exception as e:
            return {"success": False, "error": str(e)}
    

    
    # Learning Progress Endpoints
    def record_review_event(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """POST /api/learning/review"""
        try:
            user_id = request_data.get('user_id')
            word_id = request_data.get('word_id')
            response_accuracy = request_data.get('response_accuracy')
            response_time_ms = request_data.get('response_time_ms', 0)
            
            if not all([user_id, word_id]) or response_accuracy is None:
                return {"success": False, "error": "Missing required fields"}
            
            return self.service.record_review_event(user_id, word_id, response_accuracy, response_time_ms)
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_daily_learning_list(self, user_id: str, list_size: int = 20) -> Dict[str, Any]:
        """GET /api/learning/daily-list/{user_id}?size={list_size}"""
        try:
            word_ids = self.service.get_daily_learning_list(user_id, list_size)
            return {"success": True, "data": {"word_ids": word_ids}}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Data Migration Endpoints
    def start_migration(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """POST /api/migration/start"""
        try:
            user_id = request_data.get('user_id')
            local_data = request_data.get('local_data')
            
            if not all([user_id, local_data]):
                return {"success": False, "error": "Missing user_id or local_data"}
            
            return self.service.start_migration(user_id, local_data)
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Analytics Endpoints
    def get_user_activity_metrics(self) -> Dict[str, Any]:
        """GET /api/analytics/user-activity"""
        try:
            metrics = self.service.get_user_activity_metrics()
            return {"success": True, "data": metrics}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_vocabulary_analytics(self) -> Dict[str, Any]:
        """GET /api/analytics/vocabulary"""
        try:
            analytics = self.service.get_vocabulary_analytics()
            return {"success": True, "data": analytics}
        except Exception as e:
            return {"success": False, "error": str(e)}


class APIResponse:
    """Helper class for standardized API responses."""
    
    @staticmethod
    def success(data: Any = None, message: str = "") -> Dict[str, Any]:
        """Create a success response."""
        response = {"success": True}
        if data is not None:
            response["data"] = data
        if message:
            response["message"] = message
        return response
    
    @staticmethod
    def error(message: str, code: str = "GENERAL_ERROR") -> Dict[str, Any]:
        """Create an error response."""
        return {
            "success": False,
            "error": message,
            "error_code": code
        }
    
    @staticmethod
    def validation_error(field: str, message: str) -> Dict[str, Any]:
        """Create a validation error response."""
        return {
            "success": False,
            "error": f"Validation error: {message}",
            "error_code": "VALIDATION_ERROR",
            "field": field
        }