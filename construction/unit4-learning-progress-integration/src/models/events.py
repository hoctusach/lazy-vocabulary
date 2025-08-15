from dataclasses import dataclass
from typing import Any, Dict

@dataclass
class DomainEvent:
    timestamp: str
    event_type: str
    data: Dict[str, Any]

@dataclass
class AppStartedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any]):
        super().__init__(
            timestamp=data.get('timestamp', ''),
            event_type='AppStarted',
            data=data
        )

@dataclass
class DateChangedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any]):
        super().__init__(
            timestamp=data.get('timestamp', ''),
            event_type='DateChanged',
            data=data
        )

@dataclass
class ProgressUpdatedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any]):
        super().__init__(
            timestamp=data.get('timestamp', ''),
            event_type='ProgressUpdated',
            data=data
        )

@dataclass
class StatsRefreshedEvent(DomainEvent):
    def __init__(self, data: Dict[str, Any]):
        super().__init__(
            timestamp=data.get('timestamp', ''),
            event_type='StatsRefreshed',
            data=data
        )