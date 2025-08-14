from dataclasses import dataclass

@dataclass(frozen=True)
class DeviceInfo:
    device_type: str
    user_agent: str
    ip_address: str