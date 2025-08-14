from dataclasses import dataclass
from typing import List

@dataclass(frozen=True)
class MigrationResult:
    total_items: int
    migrated_items: int
    skipped_items: int
    conflict_count: int
    errors: List[str]
    summary: str