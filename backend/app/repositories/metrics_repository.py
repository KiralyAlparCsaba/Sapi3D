from typing import List, Optional
from sqlalchemy import select, func
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
        Get all performance metrics for a specific session.

        Args:
            session_id: Session ID to filter metrics by

        Returns:
            List of PerfMetrics instances
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

    async def get_summary_for_session(self, session_id: int) -> Optional[PerfMetricsSummary]:
        """
        Compute average, min, max, and total samples for a session’s metrics.
        """
        result = await self.db.execute(
            select(
                func.avg(PerfMetrics.fps).label("avg_fps"),
                func.avg(PerfMetrics.memory_mb).label("avg_memory_mb"),
                func.avg(PerfMetrics.latency_ms).label("avg_latency_ms"),
                func.avg(PerfMetrics.cpu_gpu_usage).label("avg_cpu_gpu_usage"),
                func.min(PerfMetrics.fps).label("min_fps"),
                func.max(PerfMetrics.fps).label("max_fps"),
                func.count(PerfMetrics.metrics_id).label("total_samples")
            ).where(PerfMetrics.session_id == session_id)
        )

        row = result.one_or_none()
        if not row:
            return None

        return PerfMetricsSummary(
            session_id=session_id,
            avg_fps=row.avg_fps or 0,
            avg_memory_mb=row.avg_memory_mb or 0,
            avg_latency_ms=row.avg_latency_ms or 0,
            avg_cpu_gpu_usage=row.avg_cpu_gpu_usage or 0,
            min_fps=row.min_fps or 0,
            max_fps=row.max_fps or 0,
            total_samples=row.total_samples or 0,
        )
