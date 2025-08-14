from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os

app = FastAPI(title="Lazy Vocabulary API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for MVP
users_db = {}
vocabulary_db = {}

class User(BaseModel):
    email: str
    nickname: str

class VocabularyData(BaseModel):
    progress: dict

@app.get("/")
def root():
    return {"message": "Lazy Vocabulary API", "status": "running"}

@app.post("/users")
def create_user(user: User):
    user_id = len(users_db) + 1
    users_db[user_id] = {"id": user_id, "email": user.email, "nickname": user.nickname}
    return {"user_id": user_id, "message": "User created"}

@app.get("/users/{user_id}/vocabulary")
def get_vocabulary(user_id: int):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    return vocabulary_db.get(user_id, {})

@app.post("/users/{user_id}/vocabulary")
def save_vocabulary(user_id: int, data: VocabularyData):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    vocabulary_db[user_id] = data.progress
    return {"message": "Vocabulary saved"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))