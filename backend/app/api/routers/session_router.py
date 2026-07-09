from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from core.database import get_db
from core.security import Roles, require_registered_user
from repositories.session_repository import SessionRepository
from repositories.metrics_repository import MetricsRepository
from schemas.session import SessionCreate, SessionUpdate, SessionResponse
from schemas.metrics import PerfMetricsCreate, PerfMetricsResponse, PerfMetricsSummary


router = APIRouter(prefix="/sessions")


def _is_admin(user) -> bool:
    return getattr(user, "role_id", Roles.GUEST) == Roles.ADMIN


async def _get_owned_session(
    session_id: int, current_user, repo: SessionRepository
):
    """Fetch a session and verify the caller owns it (or is admin)."""
    session = await repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != current_user.user_id and not _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own sessions",
        )
    return session


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: SessionCreate,
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start a new user session for the authenticated user.
    The user_id is always taken from the token — clients cannot create
    sessions on behalf of other users.
    Automatically closes any previously open sessions for the same user
    so only one active session exists per user at any time.
    """
    repo = SessionRepository(db)

    # user_id comes from the token, never from the request body
    payload = data.model_dump()
    payload["user_id"] = current_user.user_id

    # Close all previously open sessions for this user
    existing_active = await repo.get_active_sessions(user_id=current_user.user_id)
    now = datetime.now(timezone.utc)
    for old_session in existing_active:
        await repo.end_session(old_session.session_id, ended_at=now)

    session = await repo.create(**payload)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a session by its ID (owner or admin only).
    """
    repo = SessionRepository(db)
    return await _get_owned_session(session_id, current_user, repo)


@router.put("/{session_id}", response_model=SessionResponse)
async def end_session(
    session_id: int,
    data: SessionUpdate,
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    """
    End a session by updating its ended_at timestamp (owner or admin only).
    """
    repo = SessionRepository(db)
    await _get_owned_session(session_id, current_user, repo)
    session = await repo.end_session(session_id, data.ended_at)
    await db.commit()
    return session


@router.get("/", response_model=List[SessionResponse])
async def get_user_sessions(
    user_id: int,
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all sessions for a specific user (self or admin only).
    """
    if user_id != current_user.user_id and not _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only list your own sessions",
        )
    repo = SessionRepository(db)
    sessions = await repo.get_by_user_id(user_id)
    return sessions


@router.post("/{session_id}/metrics", response_model=PerfMetricsResponse, status_code=status.HTTP_201_CREATED)
async def add_performance_metric(
    session_id: int,
    data: PerfMetricsCreate,
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Record a new performance metric for a session (owner or admin only).
    """
    session_repo = SessionRepository(db)
    await _get_owned_session(session_id, current_user, session_repo)

    metrics_repo = MetricsRepository(db)
    payload = data.model_dump()
    payload["session_id"] = session_id  # path param wins over body
    metric = await metrics_repo.create(**payload)
    await db.commit()
    await db.refresh(metric)
    return metric


@router.get("/{session_id}/metrics", response_model=List[PerfMetricsResponse])
async def get_session_metrics(
    session_id: int,
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all performance metrics for a session (owner or admin only).
    """
    session_repo = SessionRepository(db)
    await _get_owned_session(session_id, current_user, session_repo)

    metrics_repo = MetricsRepository(db)
    metrics = await metrics_repo.get_by_session_id(session_id)
    return metrics


@router.get("/{session_id}/metrics/summary", response_model=PerfMetricsSummary)
async def get_session_metrics_summary(
    session_id: int,
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve summary statistics for a session's performance metrics (owner or admin only).
    """
    session_repo = SessionRepository(db)
    await _get_owned_session(session_id, current_user, session_repo)

    metrics_repo = MetricsRepository(db)
    summary = await metrics_repo.get_summary_for_session(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="No metrics found for this session")
    return summary
