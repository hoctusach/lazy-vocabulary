from typing import Dict, List, Callable
from models.events import DomainEvent

class EventBus:
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, event_type: str, handler: Callable):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
    
    def publish(self, event: DomainEvent):
        print(f'Publishing event: {event.event_type}')
        
        if event.event_type in self.subscribers:
            for handler in self.subscribers[event.event_type]:
                try:
                    handler(event)
                except Exception as e:
                    print(f'Error handling event {event.event_type}: {e}')
    
    def unsubscribe(self, event_type: str, handler: Callable):
        if event_type in self.subscribers:
            self.subscribers[event_type].remove(handler)