from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.metrics import PerfMetrics
from repositories.base import BaseRepository
from schemas.metrics import PerfMetricsSummary


class MetricsRepository(BaseRepository[PerfMetrics]):
    """Repository for PerfMetrics model with custom queries."""

    def __init__(self, db: AsyncSession):
        super().__init__(PerfMetrics, db)

    async def get_by_session_id(self, session_id: int) -> List[PerfMetrics]:
        """
        Get all performance metrics for a specific session, ordered by time.
        """
        result = await self.db.execute(
            select(PerfMetrics)
            .where(PerfMetrics.session_id == session_id)
            .order_by(PerfMetrics.timestamp.asc())
        )
        return list(result.scalars().all())

    async def get_latest_for_session(self, session_id: int) -> Optional[PerfMetrics]:
        """
        Get the most recent performance metric for a session.
        """
        result = await self.db.execute(
            select(PerfMetrics)
            .where(PerfMetrics.session_id == session_id)
            .order_by(PerfMetrics.timestamp.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    # ────────────────────────────────────────────────
    # WEIGHTED SUMMARY SYSTEM (Using Frame Time)
    # ────────────────────────────────────────────────

    async def get_summary_for_session(
        self, session_id: int
    ) -> Optional[PerfMetricsSummary]:
        """
        Compute WEIGHTED average metrics based on time between samples.
        This avoids FPS spikes from distorting averages.
        """
        metrics = await self.get_by_session_id(session_id)
        if len(metrics) < 2:
            return None

        total_time = 0.0
        weighted_fps = 0.0
        weighted_mem = 0.0
        weighted_latency = 0.0
        weighted_frame_time = 0.0

        # Compute weighted values based on duration between samples
        for i in range(1, len(metrics)):
            prev: PerfMetrics = metrics[i - 1]
            curr: PerfMetrics = metrics[i]

            dt = (curr.timestamp - prev.timestamp).total_seconds()
            if dt <= 0:
                continue

            total_time += dt
            weighted_fps += prev.fps * dt
            weighted_mem += prev.memory_mb * dt
            weighted_latency += prev.latency_ms * dt
            weighted_frame_time += prev.frame_time_ms * dt

        if total_time == 0:
            return None

        return PerfMetricsSummary(
            session_id=session_id,
            avg_fps=weighted_fps / total_time,
            avg_memory_mb=weighted_mem / total_time,
            avg_latency_ms=weighted_latency / total_time,
            avg_frame_time_ms=weighted_frame_time / total_time,
            min_fps=min(m.fps for m in metrics),
            max_fps=max(m.fps for m in metrics),
            total_samples=len(metrics)
        )