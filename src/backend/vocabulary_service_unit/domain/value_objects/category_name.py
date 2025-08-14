from dataclasses import dataclass

@dataclass(frozen=True)
class CategoryName:
    value: str
    
    def __post_init__(self):
        if not self.validate():
            raise ValueError("Invalid category name")
    
    def validate(self) -> bool:
        return bool(self.value and self.value.strip() and len(self.value) <= 100)