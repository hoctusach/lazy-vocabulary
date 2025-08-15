from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class VocabularyWord(BaseModel):
    word: str
    meaning: str
    example: str
    translation: Optional[str] = None
    count: int = Field(default=0)
    category: str = Field(default="topic vocab")

class VocabularySheet(BaseModel):
    sheet_name: str
    words: List[VocabularyWord]

class VocabularyData(BaseModel):
    user_id: str
    sheets: Dict[str, List[VocabularyWord]]
    last_uploaded_at: Optional[str] = None

class CustomWord(BaseModel):
    user_id: str
    word: str
    meaning: str
    example: str
    category: str
    created_at: str