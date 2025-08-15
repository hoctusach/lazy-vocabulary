"""
Simple event bus for serverless event-driven communication
"""
from typing import Dict, List, Callable, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Event:
    type: str
    data: Dict[str, Any]
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

class EventBus:
    def __init__(self):
        self._handlers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, event_type: str, handler: Callable):
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
    
    def publish(self, event: Event):
        if event.type in self._handlers:
            for handler in self._handlers[event.type]:
                handler(event)

# Global event bus instance (serverless)
event_bus = EventBus()