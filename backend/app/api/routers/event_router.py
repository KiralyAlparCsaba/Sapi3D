from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user
from core.database import get_db
from schemas.location import EventCreate, EventResponse, EventUpdate
from services.events_service import EventsService


router = APIRouter(prefix="/events")


def _ensure_admin(current_user) -> None:
    if current_user.role_id != 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


@router.get("/", response_model=List[EventResponse])
async def get_events(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Get all events with pagination."""
    service = EventsService(db)
    return await service.get_all_events(skip=skip, limit=limit)


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)):
    """Get an event by its ID."""
    service = EventsService(db)
    return await service.get_event_by_id(event_id)


@router.get("/location/{loc_id}", response_model=List[EventResponse])
async def get_location_events(
    loc_id: int,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Get events for a specific location."""
    service = EventsService(db)
    return await service.get_events_by_location_id(loc_id=loc_id, skip=skip, limit=limit)


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new event (admin only)."""
    _ensure_admin(current_user)
    service = EventsService(db)
    return await service.create_event(event_data)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    event_data: EventUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an event (admin only)."""
    _ensure_admin(current_user)
    service = EventsService(db)
    return await service.update_event(event_id, event_data)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an event (admin only)."""
    _ensure_admin(current_user)
    service = EventsService(db)
    await service.delete_event(event_id)


@router.post("/{event_id}/image", response_model=EventResponse)
async def upload_event_image(
    event_id: int,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload event image (admin only)."""
    _ensure_admin(current_user)

    file_bytes = await file.read()
    await file.close()

    service = EventsService(db)
    return await service.upload_event_image(
        event_id=event_id,
        file_bytes=file_bytes,
        content_type=file.content_type or "",
    )


@router.put("/{event_id}/image", response_model=EventResponse)
async def replace_event_image(
    event_id: int,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace event image (admin only)."""
    _ensure_admin(current_user)

    file_bytes = await file.read()
    await file.close()

    service = EventsService(db)
    return await service.upload_event_image(
        event_id=event_id,
        file_bytes=file_bytes,
        content_type=file.content_type or "",
    )


@router.delete("/{event_id}/image", response_model=EventResponse)
async def delete_event_image(
    event_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete event image (admin only)."""
    _ensure_admin(current_user)
    service = EventsService(db)
    return await service.delete_event_image(event_id)
