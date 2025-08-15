class ComponentInitializer:
    def __init__(self, integrator):
        self.integrator = integrator
        self.initialization_order = [
            'learning_progress',
            'daily_scheduler',
            'playback_queue',
            'ui_integration'
        ]
    
    def initialize_components(self):
        for component in self.initialization_order:
            self._initialize_component(component)
            if self.integrator.state:
                setattr(self.integrator.state.components_ready, component, True)
            print(f'Component {component} initialized')
    
    def _initialize_component(self, component: str):
        if component == 'learning_progress':
            self._initialize_learning_progress()
        elif component == 'daily_scheduler':
            self._initialize_daily_scheduler()
        elif component == 'playback_queue':
            self._initialize_playback_queue()
        elif component == 'ui_integration':
            self._initialize_ui_integration()
    
    def _initialize_learning_progress(self):
        # Migrate existing data if needed
        print('Migrating learning progress data...')
        
        # Reset daily counters if date changed
        if self.integrator.state and self.integrator.state.has_date_changed:
            print('Resetting daily exposures due to date change')
    
    def _initialize_daily_scheduler(self):
        print('Initializing daily scheduler...')
        
        # Check if daily selection exists for today
        if self.integrator.state and self.integrator.state.has_date_changed:
            print('Generating new daily selection due to date change')
    
    def _initialize_playback_queue(self):
        print('Initializing playback queue...')
    
    def _initialize_ui_integration(self):
        print('Initializing UI integration...')