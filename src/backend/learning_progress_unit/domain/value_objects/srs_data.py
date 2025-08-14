from dataclasses import dataclass
from enum import Enum

class ConfidenceLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

@dataclass(frozen=True)
class ReviewResponse:
    is_correct: bool
    confidence: ConfidenceLevel
    
    def validate(self) -> bool:
        return isinstance(self.is_correct, bool) and isinstance(self.confidence, ConfidenceLevel)

@dataclass(frozen=True)
class SRSData:
    interval: int  # days
    ease_factor: float
    repetitions: int
    
    def calculate_next_interval(self, response: ReviewResponse) -> int:
        if not response.is_correct:
            return 1  # Reset to 1 day if incorrect
        
        if self.repetitions == 0:
            return 1
        elif self.repetitions == 1:
            return 6
        else:
            return max(1, int(self.interval * self.ease_factor))
    
    def update_ease_factor(self, response: ReviewResponse) -> float:
        if not response.is_correct:
            return max(1.3, self.ease_factor - 0.2)
        
        confidence_modifier = {
            ConfidenceLevel.LOW: -0.15,
            ConfidenceLevel.MEDIUM: 0.0,
            ConfidenceLevel.HIGH: 0.1
        }
        
        new_factor = self.ease_factor + confidence_modifier[response.confidence]
        return max(1.3, new_factor)