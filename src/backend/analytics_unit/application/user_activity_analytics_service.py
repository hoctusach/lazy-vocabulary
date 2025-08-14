from typing import Dict, Any
from datetime import date, datetime
from ..domain.entities.user_activity_metrics import UserActivityMetrics
from ..domain.repositories.analytics_repository import UserActivityMetricsRepository
from ..domain.value_objects.identifiers import MetricsId
from ..domain.value_objects.analytics_data import TimePeriod, UserActivityData, PeriodType

class UserActivityAnalyticsService:
    def __init__(self, metrics_repo: UserActivityMetricsRepository):
        self.metrics_repo = metrics_repo
        self._active_users = set()  # Simple in-memory tracking for demo
    
    def record_user_activity(self, user_id: str) -> None:
        """Record user activity (login, session start, etc.)"""
        self._active_users.add(user_id)
    
    def get_activity_metrics(self, period_type: str = "daily") -> Dict[str, Any]:
        """Get user activity metrics for a period"""
        today = date.today()
        period_enum = PeriodType(period_type.lower())
        
        period = TimePeriod(
            start_date=today,
            end_date=today,
            period_type=period_enum
        )
        
        metrics = self.metrics_repo.find_by_period(period)
        
        if metrics is None:
            # Generate current metrics
            active_count = len(self._active_users)
            activity_data = UserActivityData(
                daily_active_users=active_count,
                weekly_active_users=active_count,  # Simplified for demo
                monthly_active_users=active_count,
                new_users=max(0, active_count - 5),  # Mock calculation
                returning_users=min(5, active_count)
            )
            
            metrics = UserActivityMetrics(
                metrics_id=MetricsId.generate(),
                period=period,
                active_users=activity_data
            )
            
            self.metrics_repo.save(metrics)
        
        return {
            "period": period_type,
            "daily_active_users": metrics.active_users.daily_active_users,
            "weekly_active_users": metrics.active_users.weekly_active_users,
            "monthly_active_users": metrics.active_users.monthly_active_users,
            "new_users": metrics.active_users.new_users,
            "returning_users": metrics.active_users.returning_users,
            "generated_at": metrics.generated_at.isoformat()
        }