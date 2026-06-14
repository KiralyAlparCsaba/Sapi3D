from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class ActiveSessionInfo(BaseModel):
    """Info about a currently active session, shown in the live feed."""
    session_id: int
    user_id: int
    username: str
    started_at: datetime
    device_type: Optional[str] = None
    app_version: Optional[str] = None
    latest_fps: Optional[int] = None
    latest_memory_mb: Optional[int] = None
    latest_latency_ms: Optional[int] = None
    latest_metric_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DashboardOverview(BaseModel):
    """High-level metrics shown in the stat cards at the top."""
    active_sessions: int
    online_users: int
    avg_fps: float
    avg_memory_mb: float
    avg_latency_ms: float
    avg_session_duration_minutes: float
    total_sessions_today: int
    total_quality_reductions: int
    guest_logins_today: int = 0
    guest_logins_week: int = 0


class MetricPoint(BaseModel):
    """A single point in the FPS/memory/latency time series.
    Values are None for hours where no metrics were recorded."""
    timestamp: datetime
    avg_fps: Optional[float] = None
    avg_memory_mb: Optional[float] = None
    avg_latency_ms: Optional[float] = None


class DurationBucket(BaseModel):
    """One bar in the session duration histogram."""
    label: str
    count: int


class DeviceCount(BaseModel):
    """One slice in the device breakdown pie."""
    device_type: str
    count: int


class ModeCount(BaseModel):
    """One slice in the play-mode breakdown pie."""
    mode: str
    count: int


class DeviceModeRow(BaseModel):
    """One cell in the device × play-mode performance matrix."""
    device_type: str
    play_mode: Optional[str] = None   # None = overall (all modes combined)
    avg_fps: Optional[float] = None
    avg_memory_mb: Optional[float] = None
    avg_latency_ms: Optional[float] = None
    sample_count: int = 0


class EngagementData(BaseModel):
    """Engagement stats: device split + session duration distribution + play mode."""
    device_breakdown: List[DeviceCount]
    duration_buckets: List[DurationBucket]
    mode_breakdown: List[ModeCount]
