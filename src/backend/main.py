from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.user_endpoints import router as user_router
from .api.learning_endpoints import router as learning_router
from .api.settings_endpoints import router as settings_router
from .api.vocabulary_endpoints import router as vocabulary_router
from .api.tracking_endpoints import router as tracking_router

app = FastAPI(title="Lazy Vocabulary Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(user_router)
app.include_router(learning_router)
app.include_router(settings_router)
app.include_router(vocabulary_router)
app.include_router(tracking_router)

@app.get("/")
async def root():
    return {"message": "Lazy Vocabulary Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}