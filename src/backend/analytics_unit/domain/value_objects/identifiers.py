import uuid
from dataclasses import dataclass

@dataclass(frozen=True)
class MetricsId:
    value: str
    
    @classmethod
    def generate(cls):
        return cls(str(uuid.uuid4()))

@dataclass(frozen=True)
class AnalyticsId:
    value: str
    
    @classmethod
    def generate(cls):
        return cls(str(uuid.uuid4()))

@dataclass(frozen=True)
class ReportId:
    value: str
    
    @classmethod
    def generate(cls):
        return cls(str(uuid.uuid4()))