from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
def get_db():
    return psycopg2.connect(
        os.getenv("DATABASE_URL"),
        cursor_factory=RealDictCursor
    )

class UserData(BaseModel):
    email: str
    nickname: str

class VocabularyData(BaseModel):
    progress: dict
    settings: dict

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/users")
def create_user(user: UserData):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, nickname) VALUES (%s, %s) RETURNING id",
                (user.email, user.nickname)
            )
            user_id = cur.fetchone()["id"]
    return {"user_id": user_id}

@app.get("/users/{user_id}/vocabulary")
def get_vocabulary(user_id: int):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT progress FROM vocabulary WHERE user_id = %s", (user_id,))
            result = cur.fetchone()
    return result["progress"] if result else {}

@app.post("/users/{user_id}/vocabulary")
def save_vocabulary(user_id: int, data: VocabularyData):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO vocabulary (user_id, progress) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET progress = %s",
                (user_id, data.progress, data.progress)
            )
    return {"status": "saved"}