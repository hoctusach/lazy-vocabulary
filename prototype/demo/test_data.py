"""Test data for demo scenarios"""

SAMPLE_VOCABULARY = [
    "apple", "banana", "cherry", "date", "elderberry",
    "fig", "grape", "honeydew", "kiwi", "lemon",
    "mango", "nectarine", "orange", "papaya", "quince"
]

DEMO_SCENARIOS = {
    "new_learner": {
        "description": "New learner with no previous progress",
        "words": SAMPLE_VOCABULARY[:5],
        "existing_progress": {}
    },
    
    "returning_learner": {
        "description": "Returning learner with some progress",
        "words": SAMPLE_VOCABULARY[:8],
        "existing_progress": {
            "apple": {"correct_count": 3, "incorrect_count": 1},
            "banana": {"correct_count": 1, "incorrect_count": 2},
            "cherry": {"correct_count": 5, "incorrect_count": 0}
        }
    },
    
    "advanced_learner": {
        "description": "Advanced learner with extensive progress",
        "words": SAMPLE_VOCABULARY,
        "existing_progress": {
            "apple": {"correct_count": 10, "incorrect_count": 1},
            "banana": {"correct_count": 8, "incorrect_count": 2},
            "cherry": {"correct_count": 12, "incorrect_count": 0},
            "date": {"correct_count": 6, "incorrect_count": 3},
            "elderberry": {"correct_count": 4, "incorrect_count": 4}
        }
    }
}