from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.config import settings
from core.logging import logger
from repositories.locations_repository import LocationObjectsRepository, LocationsRepository
from schemas.location import LocationCreate, LocationResponse, LocationUpdate


class LocationsService:
    """Service layer handling location CRUD operations and model markers."""

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
        await self.location_repo.delete(location_id)
        await self.db.commit()
        logger.info(f"Deleted location: {location.name}")
        

    
