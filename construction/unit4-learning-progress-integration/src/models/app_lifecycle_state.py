from dataclasses import dataclass
from typing import Dict

@dataclass
class ComponentsReady:
    learning_progress: bool = False
    daily_scheduler: bool = False
    playback_queue: bool = False
    ui_integration: bool = False

@dataclass
class AppLifecycleState:
    is_initialized: bool = False
    current_date: str = ""
    last_init_date: str = ""
    has_date_changed: bool = False
    initialization_timestamp: str = ""
    components_ready: ComponentsReady = None
    
    def __post_init__(self):
        if self.components_ready is None:
            self.components_ready = ComponentsReady()

@dataclass
class SystemCoordination:
    initialization_order: list[str]
    dependency_map: Dict[str, list[str]]
    readiness_checks: Dict[str, callable]