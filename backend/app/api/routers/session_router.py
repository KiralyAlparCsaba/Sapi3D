from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from core.database import get_db
from repositories.session_repository import SessionRepository, DeviceRepository
from repositories.metrics_repository import MetricsRepository
from schemas.session import SessionCreate, SessionUpdate, SessionResponse
from schemas.metrics import PerfMetricsCreate, PerfMetricsResponse, PerfMetricsSummary


router = APIRouter(prefix="/sessions", tags=["Sessions"])


# ───────────────────────────────
# SESSION ENDPOINTS
# ───────────────────────────────

@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(data: SessionCreate, db: AsyncSession = Depends(get_db)):
    """
    Start a new user session.
    """
    repo = SessionRepository(db)
    session = await repo.create(**data.dict())
    return session


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve a session by its ID.
    """
    repo = SessionRepository(db)
    session = await repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def end_session(session_id: int, data: SessionUpdate, db: AsyncSession = Depends(get_db)):
    """
    End a session by updating its ended_at timestamp.
    """
    repo = SessionRepository(db)
    session = await repo.end_session(session_id, data.ended_at)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/", response_model=List[SessionResponse])
async def get_user_sessions(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    List all sessions for a specific user.
    """
    repo = SessionRepository(db)
    sessions = await repo.get_by_user_id(user_id)
    return sessions


# ───────────────────────────────
# PERFORMANCE METRICS ENDPOINTS
# ───────────────────────────────

@router.post("/{session_id}/metrics", response_model=PerfMetricsResponse, status_code=status.HTTP_201_CREATED)
async def add_performance_metric(session_id: int, data: PerfMetricsCreate, db: AsyncSession = Depends(get_db)):
    """
    Record a new performance metric for a session.
    """
    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    metrics_repo = MetricsRepository(db)
    metric = await metrics_repo.create(**data.dict())
    return metric


@router.get("/{session_id}/metrics", response_model=List[PerfMetricsResponse])
async def get_session_metrics(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve all performance metrics for a session.
    """
    metrics_repo = MetricsRepository(db)
    metrics = await metrics_repo.get_by_session_id(session_id)
    return metrics


@router.get("/{session_id}/metrics/summary", response_model=PerfMetricsSummary)
async def get_session_metrics_summary(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve summary statistics for a session’s performance metrics.
    """
    metrics_repo = MetricsRepository(db)
    summary = await metrics_repo.get_summary_for_session(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="No metrics found for this session")
    return summary
