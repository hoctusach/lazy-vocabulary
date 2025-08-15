from datetime import datetime
from models.app_lifecycle_state import AppLifecycleState, ComponentsReady
from models.events import AppStartedEvent, DateChangedEvent
from repositories.app_state_repository import AppStateRepository

class LearningProgressIntegrator:
    def __init__(self, event_bus):
        self.event_bus = event_bus
        self.app_state_repo = AppStateRepository()
        self.state = None
    
    def initialize_on_app_start(self):
        print('LearningProgressIntegrator: Starting app initialization')
        
        # Initialize state
        current_date = self._get_current_date()
        last_init_date = self.app_state_repo.get_last_init_date() or ''
        
        self.state = AppLifecycleState(
            is_initialized=False,
            current_date=current_date,
            last_init_date=last_init_date,
            has_date_changed=False,
            initialization_timestamp=datetime.now().isoformat(),
            components_ready=ComponentsReady()
        )
        
        # Check for date change
        self.check_date_change()
        
        # Mark as initialized
        self.state.is_initialized = True
        self.app_state_repo.save_last_init_date(current_date)
        
        # Publish app started event
        self.event_bus.publish(AppStartedEvent({
            'timestamp': self.state.initialization_timestamp,
            'is_first_load': self.state.last_init_date != current_date
        }))
    
    def check_date_change(self) -> bool:
        current_date = self._get_current_date()
        last_date = self.state.last_init_date if self.state else self.app_state_repo.get_last_init_date()
        
        if last_date and last_date != current_date:
            if self.state:
                self.state.has_date_changed = True
                self.state.current_date = current_date
            
            self.event_bus.publish(DateChangedEvent({
                'previous_date': last_date,
                'current_date': current_date,
                'timestamp': datetime.now().isoformat()
            }))
            
            print(f'Date changed from {last_date} to {current_date}')
            return True
        
        return False
    
    def _get_current_date(self) -> str:
        return datetime.now().strftime('%Y-%m-%d')