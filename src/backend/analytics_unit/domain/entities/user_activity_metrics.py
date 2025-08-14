from dataclasses import dataclass
from datetime import datetime
from ..value_objects.identifiers import MetricsId
from ..value_objects.analytics_data import TimePeriod, UserActivityData

@dataclass
class UserActivityMetrics:
    metrics_id: MetricsId
    period: TimePeriod
    active_users: UserActivityData
    generated_at: datetime = None
    last_updated_at: datetime = None
    
    def __post_init__(self):
        if self.generated_at is None:
            self.generated_at = datetime.now()
        if self.last_updated_at is None:
            self.last_updated_at = datetime.now()
    
    def update_metrics(self, new_data: UserActivityData):
        self.active_users = new_data
        self.last_updated_at = datetime.now()