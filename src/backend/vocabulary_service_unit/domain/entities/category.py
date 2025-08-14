from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from ..value_objects.category_id import CategoryId
from ..value_objects.category_name import CategoryName

@dataclass
class Category:
    category_id: CategoryId
    name: CategoryName
    description: Optional[str] = None
    word_count: int = 0
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()