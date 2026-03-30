from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# PerfMetrics Schemas
class PerfMetricsBase(BaseModel):
    """Base schema for PerfMetrics."""
    session_id: int
    timestamp: datetime
    fps: int = Field(..., ge=0)
    memory_mb: int = Field(..., ge=0)
    latency_ms: int = Field(..., ge=0)


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