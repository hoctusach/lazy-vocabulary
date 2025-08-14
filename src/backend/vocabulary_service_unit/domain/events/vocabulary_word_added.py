from dataclasses import dataclass
from datetime import datetime
from ..value_objects.word_id import WordId
from ..value_objects.category_id import CategoryId
from ..value_objects.word_text import WordText

@dataclass
class VocabularyWordAdded:
    word_id: WordId
    category_id: CategoryId
    word: WordText
    occurred_at: datetime