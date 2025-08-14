"""FastAPI server for User Management unit."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import uvicorn

from service_factory import UserManagementServiceFactory


app = FastAPI(title="User Management API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize service factory
service_factory = UserManagementServiceFactory()
auth_controller = service_factory.get_auth_controller()


@app.post("/api/auth/register")
async def register(request: Dict[str, Any]):
    """Register new user."""
    result = auth_controller.register(request)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result["data"]


@app.post("/api/auth/login")
async def login(request: Dict[str, Any]):
    """User login."""
    result = auth_controller.login(request)
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["error"])
    return result["data"]


@app.post("/api/auth/validate")
async def validate_session(request: Dict[str, Any]):
    """Validate user session."""
    result = auth_controller.validate_session(request)
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["error"])
    return result["data"]


@app.post("/api/auth/logout")
async def logout(request: Dict[str, Any]):
    """User logout."""
    result = auth_controller.logout(request)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"message": result["message"]}


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "user-management"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)