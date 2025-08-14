from dataclasses import dataclass
from datetime import datetime
from ..value_objects.category_id import CategoryId
from ..value_objects.category_name import CategoryName

@dataclass
class CategoryCreated:
    category_id: CategoryId
    name: CategoryName
    occurred_at: datetime