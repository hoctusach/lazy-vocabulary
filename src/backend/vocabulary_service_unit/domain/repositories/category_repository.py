from abc import ABC, abstractmethod
from typing import List, Optional
from ..entities.category import Category
from ..value_objects.category_id import CategoryId
from ..value_objects.category_name import CategoryName

class CategoryRepository(ABC):
    @abstractmethod
    def save(self, category: Category) -> None:
        pass
    
    @abstractmethod
    def find_by_id(self, category_id: CategoryId) -> Optional[Category]:
        pass
    
    @abstractmethod
    def find_by_name(self, name: CategoryName) -> Optional[Category]:
        pass
    
    @abstractmethod
    def find_all(self) -> List[Category]:
        pass