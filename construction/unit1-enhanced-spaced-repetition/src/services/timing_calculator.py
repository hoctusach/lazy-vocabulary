"""
Timing Calculator for exposure delays
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, timedelta
from common_types import EXPOSURE_DELAYS

class TimingCalculator:
    """Calculates timing delays for word exposures"""
    
    def calculate_delay(self, exposure_count: int) -> int:
        """Calculate delay in minutes based on exposure count"""
        index = min(exposure_count, len(EXPOSURE_DELAYS) - 1)
        return EXPOSURE_DELAYS[index]
    
    def add_minutes(self, timestamp: str, minutes: int) -> str:
        """Add minutes to timestamp and return ISO string"""
        if not timestamp:
            base_time = datetime.now()
        else:
            base_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        
        new_time = base_time + timedelta(minutes=minutes)
        return new_time.isoformat()
    
    def calculate_next_allowed_time(self, exposure_count: int, last_exposure_time: str) -> str:
        """Calculate next allowed time based on exposure count"""
        delay_minutes = self.calculate_delay(exposure_count)
        return self.add_minutes(last_exposure_time, delay_minutes)
    
    def is_time_elapsed(self, next_allowed_time: str) -> bool:
        """Check if enough time has elapsed for next exposure"""
        if not next_allowed_time:
            return True
        
        try:
            allowed_time = datetime.fromisoformat(next_allowed_time.replace('Z', '+00:00'))
            return datetime.now() >= allowed_time
        except (ValueError, TypeError):
            return True