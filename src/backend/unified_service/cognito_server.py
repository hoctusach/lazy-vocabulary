"""FastAPI server with AWS Cognito integration."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import uvicorn
import os

# Load .env file
if os.path.exists('.env'):
    with open('.env', 'r') as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

from cognito_service_factory import CognitoServiceFactory
from infrastructure.aws_config import AWSConfig

app = FastAPI(title="User Management API with Cognito", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize service factory with AWS config
try:
    aws_config = AWSConfig.from_env()
    if not aws_config.is_valid():
        print("[WARNING] AWS credentials not configured. Using in-memory backend.")
        print("Set these environment variables for Cognito integration:")
        print("- AWS_ACCESS_KEY_ID")
        print("- AWS_SECRET_ACCESS_KEY") 
        print("- COGNITO_USER_POOL_ID")
        print("- AWS_REGION (optional, defaults to us-east-1)")
        
        # Fallback to in-memory implementation
        from service_factory import UserManagementServiceFactory
        service_factory = UserManagementServiceFactory()
    else:
        print("[OK] AWS Cognito integration enabled")
        service_factory = CognitoServiceFactory(aws_config)
    
    auth_controller = service_factory.get_auth_controller()
    
except Exception as e:
    print(f"[FAIL] Failed to initialize with Cognito: {e}")
    print("[FALLBACK] Using in-memory implementation...")
    from service_factory import UserManagementServiceFactory
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
    backend_type = "cognito" if aws_config.is_valid() else "in-memory"
    return {
        "status": "healthy", 
        "service": "user-management",
        "backend": backend_type
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)