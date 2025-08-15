"""
Review Interval Calculator for FR3.1 spaced repetition
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, timedelta
from common_types import REVIEW_INTERVALS, MASTER_INTERVAL

class ReviewIntervalCalculator:
    """Calculates review intervals for spaced repetition (FR3.1)"""
    
    def calculate_next_review_date(self, review_count: int, last_played_date: str) -> str:
        """Calculate next review date based on review count"""
        if review_count < len(REVIEW_INTERVALS):
            interval_days = REVIEW_INTERVALS[review_count]
        else:
            interval_days = MASTER_INTERVAL
        
        base_date = datetime.fromisoformat(last_played_date) if last_played_date else datetime.now()
        next_date = base_date + timedelta(days=interval_days)
        return next_date.isoformat().split('T')[0]
    
    def calculate_mastery_review_date(self) -> str:
        """Calculate review date for mastered words (60 days)"""
        next_date = datetime.now() + timedelta(days=MASTER_INTERVAL)
        return next_date.isoformat().split('T')[0]
    
    def is_due_for_review(self, next_review_date: str) -> bool:
        """Check if word is due for review"""
        if not next_review_date:
            return True
        
        try:
            review_date = datetime.fromisoformat(next_review_date)
            return datetime.now().date() >= review_date.date()
        except (ValueError, TypeError):
            return True
    
    def shift_review_date(self, current_date: str, days_to_add: int) -> str:
        """Shift review date by specified days (for quota management)"""
        try:
            current = datetime.fromisoformat(current_date)
            shifted = current + timedelta(days=days_to_add)
            return shifted.isoformat().split('T')[0]
        except (ValueError, TypeError):
            return datetime.now().isoformat().split('T')[0]