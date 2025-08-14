from typing import List, Optional, Dict
from ..domain.entities.category import Category
from ..domain.repositories.category_repository import CategoryRepository
from ..domain.value_objects.category_id import CategoryId
from ..domain.value_objects.category_name import CategoryName

class InMemoryCategoryRepository(CategoryRepository):
    def __init__(self):
        self._categories: Dict[str, Category] = {}
    
    def save(self, category: Category) -> None:
        self._categories[category.category_id.value] = category
    
    def find_by_id(self, category_id: CategoryId) -> Optional[Category]:
        return self._categories.get(category_id.value)
    
    def find_by_name(self, name: CategoryName) -> Optional[Category]:
        for category in self._categories.values():
            if category.name.value == name.value:
                return category
        return None
    
    def find_all(self) -> List[Category]:
        return list(self._categories.values())