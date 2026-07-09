from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from core.database import get_db
from core.security import require_admin
from repositories.admin_repository import AdminRepository
from schemas.admin import (
    DashboardOverview,
    ActiveSessionInfo,
    MetricPoint,
    EngagementData,
    DeviceModeRow,
)


router = APIRouter(prefix="/admin")


@router.get(
    "/dashboard",
    response_model=DashboardOverview,
    summary="Dashboard overview – stat cards",
)
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Returns aggregate stats for the top stat cards:
    active sessions, online users, avg FPS / memory / latency,
    avg session duration, sessions today, total quality reductions.
    """
    repo = AdminRepository(db)
    return await repo.get_dashboard_overview()


@router.get(
    "/sessions/active",
    response_model=List[ActiveSessionInfo],
    summary="Live session feed",
)
async def get_active_sessions(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Returns all currently active sessions (ended_at IS NULL)
    joined with the user's name and their latest perf_metrics record.
    Refreshed every 15 s on the frontend via polling.
    """
    repo = AdminRepository(db)
    return await repo.get_active_sessions_with_metrics()


@router.get(
    "/metrics/history",
    response_model=List[MetricPoint],
    summary="Hourly metric time-series for charts",
)
async def get_metrics_history(
    hours: int = Query(default=24, ge=1, le=168, description="How many hours back to fetch"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Returns hourly-bucketed avg FPS, memory and latency for the past N hours.
    Used by the FPS trend (LineChart) and Memory trend (AreaChart).
    """
    repo = AdminRepository(db)
    return await repo.get_metrics_history(hours=hours)


@router.get(
    "/engagement",
    response_model=EngagementData,
    summary="Device breakdown + session duration histogram",
)
async def get_engagement_data(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Returns:
    - device_breakdown: list of {device_type, count} for the PieChart
    - duration_buckets: session length distribution for the BarChart
    """
    repo = AdminRepository(db)
    return await repo.get_engagement_data()


@router.get(
    "/device-metrics",
    response_model=List[DeviceModeRow],
    summary="Avg FPS / memory / latency by device × play mode",
)
async def get_device_mode_metrics(
    hours: int = Query(default=24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_admin),
):
    """
    Returns performance averages broken down by device type and play mode.
    Used for the device × mode comparison table on the dashboard.
    """
    repo = AdminRepository(db)
    return await repo.get_device_mode_metrics(hours=hours)
