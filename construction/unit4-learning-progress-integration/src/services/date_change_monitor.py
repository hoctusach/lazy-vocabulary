import time
import threading
from datetime import datetime

class DateChangeMonitor:
    def __init__(self, integrator):
        self.integrator = integrator
        self.check_interval = 60  # 60 seconds
        self.monitoring = False
        self.monitor_thread = None
    
    def start_monitoring(self):
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        print('Date change monitoring started')
    
    def stop_monitoring(self):
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join()
        print('Date change monitoring stopped')
    
    def _monitor_loop(self):
        while self.monitoring:
            self._check_for_date_change()
            time.sleep(self.check_interval)
    
    def _check_for_date_change(self):
        current_date = datetime.now().strftime('%Y-%m-%d')
        last_known_date = self.integrator.app_state_repo.get_last_init_date()
        
        if last_known_date and last_known_date != current_date:
            print(f'Date change detected: {last_known_date} -> {current_date}')
            self.integrator.check_date_change()