from typing import List
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.logging import logger

from repositories.info_panels_repository import InfoPanelsRepository
from schemas.location import InfoPanelCreate, InfoPanelResponse, InfoPanelUpdate


class InfoPanelsService:
    """Service layer handling InfoPanel CRUD operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.panel_repo = InfoPanelsRepository(db)

    async def create_panel(self, panel_data: InfoPanelCreate) -> InfoPanelResponse:
        """Create a new info panel."""
        panel = await self.panel_repo.create(
            information=panel_data.information,
            coordinates_obj_name=panel_data.coordinates_obj_name,
            media_url=panel_data.media_url
        )
        await self.db.commit()
        await self.db.refresh(panel)
        logger.info(f"Created InfoPanel with coordinates: {panel.coordinates_obj_name}")
        return InfoPanelResponse.model_validate(panel, from_attributes=True)

    async def get_panel_by_id(self, panel_id: int) -> InfoPanelResponse:
        """Get an info panel by its ID."""
        panel = await self.panel_repo.get_by_id(panel_id)
        if not panel:
            raise HTTPException(status_code=404, detail="InfoPanel not found")
        return InfoPanelResponse.model_validate(panel, from_attributes=True)

    async def get_all_panels(self, skip: int = 0, limit: int = 100) -> List[InfoPanelResponse]:
        """Get all info panels with pagination."""
        panels = await self.panel_repo.get_all(skip=skip, limit=limit)
        return [InfoPanelResponse.model_validate(p, from_attributes=True) for p in panels]

    async def update_panel(self, panel_id: int, panel_data: InfoPanelUpdate) -> InfoPanelResponse:
        """Update an existing info panel."""
        panel = await self.panel_repo.get_by_id(panel_id)
        if not panel:
            raise HTTPException(status_code=404, detail="InfoPanel not found")

        
        if panel_data.information is not None:
            panel.information = panel_data.information
        if panel_data.coordinates_obj_name is not None:
            panel.coordinates_obj_name = panel_data.coordinates_obj_name
        if panel_data.media_url is not None:
            panel.media_url = panel_data.media_url

        await self.db.commit()
        await self.db.refresh(panel)
        logger.info(f"Updated InfoPanel ID: {panel_id}")
        return InfoPanelResponse.model_validate(panel, from_attributes=True)

    async def delete_panel(self, panel_id: int):
        """Delete an info panel."""
        panel = await self.panel_repo.get_by_id(panel_id)
        if not panel:
            raise HTTPException(status_code=404, detail="InfoPanel not found")

        await self.panel_repo.delete(panel_id)
        await self.db.commit()
        logger.info(f"Deleted InfoPanel ID: {panel_id}")