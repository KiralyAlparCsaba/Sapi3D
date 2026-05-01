from datetime import datetime, timezone
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict


class PerformanceSample(BaseModel):
    """A single timestamped performance sample."""
    t: int = Field(..., ge=0, description="Seconds since session start")
    fps: int = Field(..., ge=0)
    memory_mb: int = Field(..., ge=0)


# PerfMetrics Schemas
class PerfMetricsBase(BaseModel):
    """Base schema for PerfMetrics."""
    session_id: int
    timestamp: datetime
    fps: int = Field(..., ge=0)
    memory_mb: int = Field(..., ge=0)
    latency_ms: int = Field(..., ge=0)
    samples: Optional[List[PerformanceSample]] = Field(None, description="Time-series samples collected during the session")
    load_time_s: Optional[float] = Field(None, ge=0, description="Time in seconds from page load to model ready")


class PerfMetricsCreate(PerfMetricsBase):
    """Schema for creating PerfMetrics."""
    timestamp: datetime = Field(default_factory=datetime.now(timezone.utc))


class PerfMetricsResponse(PerfMetricsBase):
    """Schema for PerfMetrics response."""
    metrics_id: int

    model_config = ConfigDict(from_attributes=True)


class PerfMetricsSummary(BaseModel):
    """Schema for aggregated performance metrics summary."""
    session_id: int
    avg_fps: float
    avg_memory_mb: float
    avg_latency_ms: float
    min_fps: int
    max_fps: int
    total_samples: int