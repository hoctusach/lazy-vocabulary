from dataclasses import dataclass

@dataclass(frozen=True)
class Meaning:
    value: str
    
    def __post_init__(self):
        if not self.validate():
            raise ValueError("Invalid meaning")
    
    def validate(self) -> bool:
        return bool(self.value and self.value.strip() and len(self.value) <= 500)