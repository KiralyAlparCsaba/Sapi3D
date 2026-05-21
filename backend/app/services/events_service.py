import os
from typing import List

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.logging import logger
from repositories.events_repository import EventsRepository
from repositories.locations_repository import LocationsRepository
from schemas.location import EventCreate, EventResponse, EventUpdate


class EventsService:
    """Service layer for Event operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.events_repo = EventsRepository(db)
        self.locations_repo = LocationsRepository(db)

    async def get_event_by_id(self, event_id: int) -> EventResponse:
        """Get a single event by its ID."""
        event = await self.events_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        return EventResponse.model_validate(event, from_attributes=True)

    async def get_all_events(self, skip: int = 0, limit: int = 100) -> List[EventResponse]:
        """Get all events with pagination."""
        events = await self.events_repo.get_all(skip=skip, limit=limit)
        return [EventResponse.model_validate(event, from_attributes=True) for event in events]

    async def get_events_by_location_id(
        self,
        loc_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[EventResponse]:
        """Get all events for one location."""
        location = await self.locations_repo.get_by_id(loc_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

        events = await self.events_repo.get_all_by_location_id(loc_id, skip=skip, limit=limit)
        return [EventResponse.model_validate(event, from_attributes=True) for event in events]

    async def create_event(self, event_data: EventCreate) -> EventResponse:
        """Create a new event."""
        location = await self.locations_repo.get_by_id(event_data.loc_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

        existing_event = await self.events_repo.get_by_name_and_location_id(
            name=event_data.name,
            loc_id=event_data.loc_id,
        )
        if existing_event:
            raise HTTPException(status_code=400, detail="Event name already exists in this location")

        event = await self.events_repo.create(
            name=event_data.name,
            description=event_data.description,
            image_path=event_data.image_path,
            event_date=event_data.event_date,
            loc_id=event_data.loc_id,
        )
        await self.db.commit()
        await self.db.refresh(event)
        logger.info(f"Created event: {event.name} (id={event.event_id})")
        return EventResponse.model_validate(event, from_attributes=True)

    async def update_event(self, event_id: int, event_data: EventUpdate) -> EventResponse:
        """Update an existing event."""
        event = await self.events_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        target_loc_id = event_data.loc_id if event_data.loc_id is not None else event.loc_id
        if event_data.loc_id is not None:
            location = await self.locations_repo.get_by_id(event_data.loc_id)
            if not location:
                raise HTTPException(status_code=404, detail="Location not found")

        target_name = event_data.name if event_data.name is not None else event.name
        existing_event = await self.events_repo.get_by_name_and_location_id(
            name=target_name,
            loc_id=target_loc_id,
        )
        if existing_event and existing_event.event_id != event.event_id:
            raise HTTPException(status_code=400, detail="Event name already exists in this location")

        if event_data.name is not None:
            event.name = event_data.name
        if event_data.description is not None:
            event.description = event_data.description
        if event_data.image_path is not None:
            event.image_path = event_data.image_path
        if event_data.event_date is not None:
            event.event_date = event_data.event_date
        if event_data.loc_id is not None:
            event.loc_id = event_data.loc_id

        await self.db.commit()
        await self.db.refresh(event)
        logger.info(f"Updated event: {event.name} (id={event.event_id})")
        return EventResponse.model_validate(event, from_attributes=True)

    async def delete_event(self, event_id: int) -> None:
        """Delete an event by its ID."""
        event = await self.events_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        await self._delete_event_image_file(event.event_id)
        await self.events_repo.delete(event_id)
        await self.db.commit()
        logger.info(f"Deleted event: {event.name} (id={event.event_id})")

    async def upload_event_image(self, event_id: int, file_bytes: bytes, content_type: str) -> EventResponse:
        """Upload or replace image for one event."""
        event = await self.events_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        if content_type not in settings.event_image_allowed_mime_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid image format. Allowed formats: JPG, PNG",
            )

        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        if len(file_bytes) > settings.event_image_max_size_bytes:
            raise HTTPException(status_code=413, detail="Image file is too large. Max size is 5MB")

        extension_by_mime = {
            "image/jpeg": "jpg",
            "image/png": "png",
        }
        extension = extension_by_mime[content_type]
        base_name = f"{event_id:09d}"
        image_filename = f"{base_name}.{extension}"

        os.makedirs(settings.events_directory, exist_ok=True)

        for allowed_ext in settings.event_image_allowed_extensions:
            candidate = os.path.join(settings.events_directory, f"{base_name}.{allowed_ext}")
            if os.path.exists(candidate) and candidate != os.path.join(settings.events_directory, image_filename):
                try:
                    os.remove(candidate)
                except OSError as exc:
                    logger.warning(f"Failed to remove old event image file {candidate}: {exc}")

        target_path = os.path.join(settings.events_directory, image_filename)
        try:
            with open(target_path, "wb") as image_file:
                image_file.write(file_bytes)
        except OSError as exc:
            logger.error(f"Failed to save image for event ID {event_id}: {exc}")
            raise HTTPException(status_code=500, detail="Failed to save image")

        event.image_path = f"/static/events/{image_filename}"
        await self.db.commit()
        await self.db.refresh(event)
        logger.info(f"Uploaded image for event ID {event_id}")
        return EventResponse.model_validate(event, from_attributes=True)

    async def delete_event_image(self, event_id: int) -> EventResponse:
        """Delete image for one event and clear image_path."""
        event = await self.events_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        await self._delete_event_image_file(event_id)
        event.image_path = None
        await self.db.commit()
        await self.db.refresh(event)
        logger.info(f"Deleted image for event ID {event_id}")
        return EventResponse.model_validate(event, from_attributes=True)

    async def _delete_event_image_file(self, event_id: int) -> None:
        base_name = f"{event_id:09d}"
        for allowed_ext in settings.event_image_allowed_extensions:
            candidate = os.path.join(settings.events_directory, f"{base_name}.{allowed_ext}")
            if os.path.exists(candidate):
                try:
                    os.remove(candidate)
                except OSError as exc:
                    logger.warning(f"Failed to remove event image file {candidate}: {exc}")
