from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from repositories.session_repository import DeviceRepository, SessionRepository
from schemas.session import DeviceResponse


router = APIRouter(prefix="/devices")


@router.get("", response_model=list[DeviceResponse])
async def get_all_devices(db: AsyncSession = Depends(get_db)):
    """List all devices."""
    repo = DeviceRepository(db)
    return await repo.get_all()


@router.get("/sessions/{session_id}", response_model=DeviceResponse)
async def get_device_by_session_id(
    session_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get device associated with a session."""
    session_repo = SessionRepository(db)
    session = await session_repo.get_by_id(session_id)

    if not session or not session.device:
        raise HTTPException(status_code=404, detail="Device not found for session")

    return session.device
