from dataclasses import dataclass

@dataclass(frozen=True)
class Nickname:
    value: str
    
    def __post_init__(self):
        if not self.validate():
            raise ValueError(f"Invalid nickname: {self.value}")
    
    def validate(self) -> bool:
        return 3 <= len(self.value) <= 50
    
    def __str__(self):
        return self.value