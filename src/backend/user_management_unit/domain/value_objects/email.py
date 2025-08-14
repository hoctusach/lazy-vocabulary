import re
from dataclasses import dataclass

@dataclass(frozen=True)
class Email:
    value: str
    
    def __post_init__(self):
        if not self.validate():
            raise ValueError(f"Invalid email: {self.value}")
    
    def validate(self) -> bool:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, self.value))
    
    def __str__(self):
        return self.value