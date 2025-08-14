from typing import Dict, Any
from ..application.migration_facade import MigrationFacade
from .models import DetectMigrationRequest, StartMigrationRequest, GetMigrationStatusRequest

class MigrationController:
    def __init__(self, facade: MigrationFacade):
        self.facade = facade
    
    def detect_migration(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            request = DetectMigrationRequest(**request_data)
            result = self.facade.detect_local_data(request.user_id, request.local_data)
            return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def start_migration(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            request = StartMigrationRequest(**request_data)
            result = self.facade.start_migration(request.user_id, request.local_data)
            return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_migration_status(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            request = GetMigrationStatusRequest(**request_data)
            result = self.facade.get_migration_status(request.user_id)
            if result:
                return {"success": True, "data": result}
            else:
                return {"success": False, "error": "No migration session found"}
        except Exception as e:
            return {"success": False, "error": str(e)}