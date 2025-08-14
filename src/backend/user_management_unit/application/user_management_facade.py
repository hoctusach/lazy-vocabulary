from datetime import datetime
from typing import Optional
from ..domain.entities.user import User
from ..domain.entities.user_session import UserSession
from ..domain.value_objects.email import Email
from ..domain.value_objects.nickname import Nickname
from ..domain.value_objects.session_id import SessionId
from ..domain.value_objects.device_info import DeviceInfo
from ..domain.services.authentication_service import AuthenticationService
from ..domain.services.user_registration_service import UserRegistrationService
from ..domain.events.user_registered import UserRegistered
from ..domain.events.user_logged_in import UserLoggedIn
from .event_publisher import EventPublisher

class UserManagementFacade:
    def __init__(self, auth_service: AuthenticationService, 
                 registration_service: UserRegistrationService,
                 event_publisher: EventPublisher):
        self.auth_service = auth_service
        self.registration_service = registration_service
        self.event_publisher = event_publisher
    
    def register_user(self, email_str: str, nickname_str: str, password: str) -> User:
        email = Email(email_str)
        nickname = Nickname(nickname_str)
        
        user = self.registration_service.register_user(email, nickname, password)
        
        event = UserRegistered(
            user_id=user.user_id,
            email=user.email,
            nickname=user.nickname,
            occurred_at=datetime.now()
        )
        self.event_publisher.publish(event)
        
        return user
    
    def login(self, email_str: str, password: str, device_type: str = "web") -> Optional[UserSession]:
        email = Email(email_str)
        device_info = DeviceInfo(device_type, "demo-agent", "127.0.0.1")
        
        session = self.auth_service.authenticate(email, password, device_info)
        
        if session:
            event = UserLoggedIn(
                user_id=session.user_id,
                session_id=session.session_id,
                device_info=session.device_info,
                occurred_at=datetime.now()
            )
            self.event_publisher.publish(event)
        
        return session
    
    def validate_session(self, session_id_str: str) -> bool:
        session_id = SessionId(session_id_str)
        return self.auth_service.validate_session(session_id)