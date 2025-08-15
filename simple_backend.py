from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import uvicorn

app = FastAPI(title="Lazy Vocabulary Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
users_db = {}
learning_progress_db = {}
vocabulary_db = {}
settings_db = {}

# Models
class LoginRequest(BaseModel):
    email: str
    password: str
    device_type: Optional[str] = "web"
    user_agent: Optional[str] = ""
    ip_address: Optional[str] = ""

class User(BaseModel):
    user_id: str
    email: str
    nickname: str

class Session(BaseModel):
    session_id: str
    user_id: str
    token: str
    expires_at: str

class LearningProgress(BaseModel):
    word: str
    user_id: str
    review_count: int = 0
    is_learned: bool = False
    last_played_date: str = ""
    status: str = "new"

class DailySelection(BaseModel):
    new_words: List[str]
    review_words: List[str]
    total_count: int

class VocabularyData(BaseModel):
    progress: dict

# Routes
@app.get("/")
async def root():
    return {"message": "Lazy Vocabulary Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# User endpoints
@app.post("/api/users/login")
async def login(request: LoginRequest):
    # Simple mock login
    user_id = "admin-user" if request.email == "admin" else f"user-{len(users_db) + 1}"
    
    # Store user
    users_db[user_id] = {
        "user_id": user_id,
        "email": request.email,
        "nickname": "Admin" if request.email == "admin" else "User"
    }
    
    return {
        "session_id": f"session-{user_id}",
        "user_id": user_id,
        "token": f"token-{user_id}",
        "expires_at": "2024-12-31T23:59:59Z"
    }

@app.get("/api/users/validate-session")
async def validate_session(token: str):
    return {
        "is_valid": True,
        "user_id": "admin-user",
        "session_id": "session-admin-user"
    }

@app.post("/api/users/logout")
async def logout(session_id: str):
    return {"success": True}

# Learning Progress endpoints
@app.get("/api/learning/progress/{user_id}")
async def get_learning_progress(user_id: str):
    return learning_progress_db.get(user_id, {})

@app.post("/api/learning/progress/{user_id}")
async def save_learning_progress(user_id: str, data: dict):
    learning_progress_db[user_id] = data
    return {"message": "Progress saved"}

# Learning endpoints
@app.get("/api/learning/daily-selection/{user_id}")
async def get_daily_selection(user_id: str, severity: str = "moderate"):
    # Mock daily selection
    mock_words = [
        "take_off", "put_on", "look_up", "turn_down", "give_up",
        "break_the_ice", "hit_the_nail", "piece_of_cake",
        "environment", "technology", "education", "health"
    ]
    
    total_count = 40 if severity == "moderate" else 20
    new_count = int(total_count * 0.4)
    
    return {
        "new_words": mock_words[:new_count],
        "review_words": mock_words[new_count:total_count],
        "total_count": total_count
    }

@app.post("/api/learning/progress/update")
async def update_progress(data: dict):
    user_id = data.get("user_id", "admin-user")
    word = data.get("word", "unknown")
    
    # Store progress
    key = f"{user_id}:{word}"
    if key not in learning_progress_db:
        learning_progress_db[key] = {
            "word": word,
            "user_id": user_id,
            "review_count": 0,
            "is_learned": False,
            "status": "new"
        }
    
    learning_progress_db[key]["review_count"] += 1
    learning_progress_db[key]["is_learned"] = True
    learning_progress_db[key]["status"] = "due"
    
    return learning_progress_db[key]

@app.get("/api/learning/progress/{user_id}/stats")
async def get_progress_stats(user_id: str):
    user_progress = [p for k, p in learning_progress_db.items() if k.startswith(f"{user_id}:")]
    
    return {
        "total_words": len(user_progress),
        "accuracy_rate": 85.0,
        "words_mastered": len([p for p in user_progress if p["is_learned"]]),
        "reviews_today": len([p for p in user_progress if p["review_count"] > 0])
    }

# Vocabulary endpoints
@app.get("/api/vocabulary/categories")
async def get_categories():
    return [
        {"category_id": "phrasal_verbs", "name": "Phrasal Verbs"},
        {"category_id": "idioms", "name": "Idioms"},
        {"category_id": "topic_vocab", "name": "Topic Vocabulary"}
    ]

@app.get("/users/{user_id}/vocabulary")
async def get_user_vocabulary(user_id: int):
    return vocabulary_db.get(str(user_id), {})

@app.post("/users/{user_id}/vocabulary")
async def save_user_vocabulary(user_id: int, data: VocabularyData):
    vocabulary_db[str(user_id)] = data.progress
    return {"message": "Vocabulary saved"}

# Settings endpoints
@app.get("/api/settings/{user_id}")
async def get_user_settings(user_id: str):
    return settings_db.get(user_id, {
        "speech_rate": 1.0,
        "preferred_voice": "",
        "translation_lang": "vi"
    })

@app.put("/api/settings/speech")
async def update_speech_settings(settings: dict):
    user_id = settings.get("user_id", "admin-user")
    if user_id not in settings_db:
        settings_db[user_id] = {}
    settings_db[user_id].update(settings)
    return settings

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8003)