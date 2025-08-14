import uuid
from dataclasses import dataclass

@dataclass(frozen=True)
class SessionId:
    value: str
    
    @classmethod
    def generate(cls):
        return cls(str(uuid.uuid4()))
    
    def __str__(self):
        return self.value