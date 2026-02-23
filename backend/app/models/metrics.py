from datetime import datetime
from sqlalchemy import Integer, ForeignKey, DateTime, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class PerfMetrics(Base):
    """PerfMetrics model for tracking performance metrics per session."""

    __tablename__ = "perf_metrics"

    metrics_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.session_id"), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fps: Mapped[int] = mapped_column(Integer, nullable=False)
    memory_mb: Mapped[int] = mapped_column(Integer, nullable=False)
    latency_ms: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Relationships
    session: Mapped["Session"] = relationship("Session", back_populates="perf_metrics")

    def __repr__(self) -> str:
        return f"<PerfMetrics(metrics_id={self.metrics_id}, session_id={self.session_id}, fps={self.fps})>"