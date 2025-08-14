from dataclasses import dataclass

@dataclass(frozen=True)
class WordText:
    value: str
    
    def __post_init__(self):
        if not self.validate():
            raise ValueError("Invalid word text")
    
    def validate(self) -> bool:
        return bool(self.value and self.value.strip() and len(self.value) <= 200)