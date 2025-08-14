"""Service factory for User Management unit."""
from domain.services import UserRegistrationService, SessionManagementService
from application.auth_service import AuthenticationService
from application.registration_service import UserRegistrationApplicationService
from infrastructure.in_memory_repositories import InMemoryUserRepository, InMemorySessionRepository
from api.controllers import AuthController


class UserManagementServiceFactory:
    def __init__(self, jwt_secret: str = "dev-secret-key"):
        self.jwt_secret = jwt_secret
        self._setup_repositories()
        self._setup_services()
        self._setup_controllers()
    
    def _setup_repositories(self):
        self.user_repository = InMemoryUserRepository()
        self.session_repository = InMemorySessionRepository()
    
    def _setup_services(self):
        # Domain services
        self.user_registration_service = UserRegistrationService(self.user_repository)
        self.session_management_service = SessionManagementService()
        
        # Application services
        self.auth_service = AuthenticationService(
            self.user_repository,
            self.session_repository,
            self.session_management_service,
            self.jwt_secret
        )
        self.registration_app_service = UserRegistrationApplicationService(
            self.user_repository,
            self.user_registration_service,
            self.jwt_secret
        )
    
    def _setup_controllers(self):
        self.auth_controller = AuthController(
            self.auth_service,
            self.registration_app_service
        )
    
    def get_auth_controller(self) -> AuthController:
        return self.auth_controller