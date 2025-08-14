"""Service factory with AWS Cognito integration."""
from domain.services import UserRegistrationService, SessionManagementService
from application.cognito_auth_service import CognitoAuthenticationService
from application.registration_service import UserRegistrationApplicationService
from infrastructure.cognito_repositories import CognitoUserRepository
from infrastructure.in_memory_repositories import InMemorySessionRepository
from infrastructure.aws_config import AWSConfig, setup_aws_credentials
from api.cognito_controllers import CognitoAuthController


class CognitoServiceFactory:
    def __init__(self, aws_config: AWSConfig, jwt_secret: str = "dev-secret-key"):
        self.aws_config = aws_config
        self.jwt_secret = jwt_secret
        
        if aws_config.is_valid():
            setup_aws_credentials(aws_config)
            self._setup_cognito_repositories()
        else:
            raise ValueError("Invalid AWS configuration. Please provide valid credentials.")
        
        self._setup_services()
        self._setup_controllers()
    
    def _setup_cognito_repositories(self):
        self.user_repository = CognitoUserRepository(
            self.aws_config.cognito_user_pool_id,
            self.aws_config.region
        )
        # Still use in-memory for sessions (can be moved to DynamoDB later)
        self.session_repository = InMemorySessionRepository()
    
    def _setup_services(self):
        # Domain services
        self.user_registration_service = UserRegistrationService(self.user_repository)
        self.session_management_service = SessionManagementService()
        
        # Application services
        self.auth_service = CognitoAuthenticationService(
            self.user_repository,
            self.session_repository,
            self.session_management_service,
            self.user_registration_service,
            self.jwt_secret
        )
        self.registration_app_service = UserRegistrationApplicationService(
            self.user_repository,
            self.user_registration_service,
            self.jwt_secret
        )
    
    def _setup_controllers(self):
        self.auth_controller = CognitoAuthController(self.auth_service)
    
    def get_auth_controller(self) -> CognitoAuthController:
        return self.auth_controller