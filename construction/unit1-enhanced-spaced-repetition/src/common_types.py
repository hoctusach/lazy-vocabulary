"""
Common types and enums for the learning progress system
"""
from enum import Enum
from typing import Literal

# Severity levels for daily selection
SeverityLevel = Literal['light', 'moderate', 'intensive']

# Word status types
WordStatus = Literal['due', 'not_due', 'new']

# Review intervals (days) for spaced repetition
REVIEW_INTERVALS = [1, 2, 3, 5, 7, 10, 14, 21, 28, 35]  # reviews 1-10
MASTER_INTERVAL = 60  # days from review 11 onward

# Exposure delays (minutes) for intra-day timing
EXPOSURE_DELAYS = [0, 5, 7, 10, 15, 30, 60, 90, 120]