from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# ────────────────────────────────────────────────
# PerfMetrics Schemas
# ────────────────────────────────────────────────

from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class PerfMetricsBase(BaseModel):
    session_id: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    fps: int = Field(..., ge=0)
    memory_mb: int = Field(..., ge=0)
    latency_ms: int = Field(..., ge=0)

    frame_time_ms: float = Field(..., ge=0)


class PerfMetricsCreate(PerfMetricsBase):
    pass


class PerfMetricsResponse(PerfMetricsBase):
    metrics_id: int
    model_config = ConfigDict(from_attributes=True)


class PerfMetricsSummary(BaseModel):
    session_id: int
    avg_fps: float
    avg_memory_mb: float
    avg_latency_ms: float
    avg_frame_time_ms: float
    min_fps: int
    max_fps: int
    total_samples: int