from typing import List, Any

class EventPublisher:
    def __init__(self):
        self.events: List[Any] = []
    
    def publish(self, event: Any) -> None:
        self.events.append(event)
        print(f"Event published: {type(event).__name__}")
    
    def get_events(self) -> List[Any]:
        return self.events.copy()