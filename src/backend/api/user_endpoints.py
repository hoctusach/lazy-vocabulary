from fastapi import APIRouter, Depends
from ..models.user_auth import LoginRequest, LoginResponse, User, Session
from ..services.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["users"])

# Global service instance
user_service_instance = UserService()

def get_user_service() -> UserService:
    return user_service_instance

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    service: UserService = Depends(get_user_service)
):
    return service.login(request)

@router.post("/logout")
async def logout(
    session_id: str,
    service: UserService = Depends(get_user_service)
):
    return {"success": service.logout(session_id)}

@router.get("/validate-session")
async def validate_session(
    token: str,
    service: UserService = Depends(get_user_service)
):
    return service.validate_session(token)