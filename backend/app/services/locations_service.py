import os
from typing import List

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.logging import logger
from repositories.locations_repository import LocationObjectsRepository, LocationsRepository
from schemas.location import LocationCreate, LocationResponse, LocationUpdate


class LocationsService:
    """Service layer handling location CRUD operations, model markers, and image uploads."""

    def __init__(
        self,
        db: AsyncSession,
        object_repository: LocationObjectsRepository | None = None,
    ):
        self.db = db
        self.object_repository = object_repository or LocationObjectsRepository()
        self.location_repo = LocationsRepository(db)

    def get_location_objects(self) -> List[str]:
        """Return all marker object names found in the GLB model file."""
        return self.object_repository.get_location_objects(settings.model_file_path)

    async def create_location(self, location_data: LocationCreate) -> LocationResponse:
        """Create a new location in the database."""
        if await self.location_repo.get_by_name(location_data.name):
            raise HTTPException(status_code=400, detail="Location name already exists")
        if await self.location_repo.get_by_object_name(location_data.button_location):
            raise HTTPException(status_code=400, detail="Button location already assigned to another location")
        location = await self.location_repo.create(
            name=location_data.name,
            button_location=location_data.button_location,
            information=location_data.information,
        )

        await self.db.commit()
        await self.db.refresh(location)
        logger.info(f"Created location: {location.name}")
        return LocationResponse.model_validate(location, from_attributes=True)

    async def get_location_by_id(self, location_id: int) -> LocationResponse:
        """Get a location by its ID."""
        location = await self.location_repo.get_by_id(location_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        return LocationResponse.model_validate(location, from_attributes=True)

    async def get_all_locations(self, skip: int = 0, limit: int = 100) -> List[LocationResponse]:
        """Get all locations with pagination."""
        locations = await self.location_repo.get_all(skip=skip, limit=limit)
        return [LocationResponse.model_validate(loc, from_attributes=True) for loc in locations]

    async def update_location(self, location_id: int, location_data: LocationUpdate) -> LocationResponse:
        """Update an existing location."""
        location = await self.location_repo.get_by_id(location_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

        if location_data.name and location_data.name != location.name:
            if await self.location_repo.get_by_name(location_data.name):
                raise HTTPException(status_code=400, detail="Location name already exists")
            location.name = location_data.name

        if location_data.button_location and location_data.button_location != location.button_location:
            existing_location = await self.location_repo.get_by_object_name(location_data.button_location)
            if existing_location and existing_location.loc_id != location.loc_id:
                raise HTTPException(status_code=400, detail="Button location already assigned to another location")
            location.button_location = location_data.button_location
        if location_data.information is not None:
            location.information = location_data.information

        await self.db.commit()
        await self.db.refresh(location)
        logger.info(f"Updated location: {location.name}")
        return LocationResponse.model_validate(location, from_attributes=True)

    async def delete_location(self, location_id: int):
        """Delete a location by its ID."""
        location = await self.location_repo.get_by_id(location_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        await self._delete_location_image_file(location_id)
        await self.location_repo.delete(location_id)
        await self.db.commit()
        logger.info(f"Deleted location: {location.name}")

    async def upload_location_image(
        self, location_id: int, file_bytes: bytes, content_type: str
    ) -> LocationResponse:
        """Upload or replace the cover image for a location."""
        location = await self.location_repo.get_by_id(location_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

        if content_type not in settings.location_image_allowed_mime_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid image format. Allowed formats: JPG, PNG",
            )
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        if len(file_bytes) > settings.location_image_max_size_bytes:
            raise HTTPException(status_code=413, detail="Image file is too large. Max size is 5MB")

        extension_by_mime = {"image/jpeg": "jpg", "image/png": "png"}
        extension = extension_by_mime[content_type]
        base_name = f"{location_id:09d}"
        image_filename = f"{base_name}.{extension}"

        os.makedirs(settings.locations_directory, exist_ok=True)

        # Remove old file with the other extension if it exists
        for allowed_ext in settings.location_image_allowed_extensions:
            candidate = os.path.join(settings.locations_directory, f"{base_name}.{allowed_ext}")
            if os.path.exists(candidate) and candidate != os.path.join(settings.locations_directory, image_filename):
                try:
                    os.remove(candidate)
                except OSError as exc:
                    logger.warning(f"Failed to remove old location image file {candidate}: {exc}")

        target_path = os.path.join(settings.locations_directory, image_filename)
        try:
            with open(target_path, "wb") as image_file:
                image_file.write(file_bytes)
        except OSError as exc:
            logger.error(f"Failed to save image for location ID {location_id}: {exc}")
            raise HTTPException(status_code=500, detail="Failed to save image")

        location.image_path = f"/static/locations/{image_filename}"
        await self.db.commit()
        await self.db.refresh(location)
        logger.info(f"Uploaded image for location ID {location_id}")
        return LocationResponse.model_validate(location, from_attributes=True)

    async def delete_location_image(self, location_id: int) -> LocationResponse:
        """Delete the cover image for a location and clear image_path."""
        location = await self.location_repo.get_by_id(location_id)
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")

        await self._delete_location_image_file(location_id)
        location.image_path = None
        await self.db.commit()
        await self.db.refresh(location)
        logger.info(f"Deleted image for location ID {location_id}")
        return LocationResponse.model_validate(location, from_attributes=True)

    async def _delete_location_image_file(self, location_id: int) -> None:
        base_name = f"{location_id:09d}"
        for allowed_ext in settings.location_image_allowed_extensions:
            candidate = os.path.join(settings.locations_directory, f"{base_name}.{allowed_ext}")
            if os.path.exists(candidate):
                try:
                    os.remove(candidate)
                except OSError as exc:
                    logger.warning(f"Failed to remove location image file {candidate}: {exc}")
