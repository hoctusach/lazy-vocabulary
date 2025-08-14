from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from ..value_objects.word_id import WordId
from ..value_objects.word_text import WordText
from ..value_objects.meaning import Meaning
from ..value_objects.category_id import CategoryId

@dataclass
class VocabularyWord:
    word_id: WordId
    word: WordText
    meaning: Meaning
    category_id: CategoryId
    example: Optional[str] = None
    translation: Optional[str] = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()