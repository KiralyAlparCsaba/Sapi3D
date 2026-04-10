from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from schemas.location import InfoPanelCreate, InfoPanelResponse, InfoPanelUpdate
from services.info_panels_service import InfoPanelsService

router = APIRouter(prefix="/info-panels")

def get_info_panels_service(db: AsyncSession = Depends(get_db)) -> InfoPanelsService:
    return InfoPanelsService(db)

@router.post("/", response_model=InfoPanelResponse, status_code=status.HTTP_201_CREATED)
async def create_info_panel(
    panel_data: InfoPanelCreate,
    service: InfoPanelsService = Depends(get_info_panels_service)
):
    return await service.create_panel(panel_data)

@router.get("/", response_model=List[InfoPanelResponse])
async def get_all_info_panels(
    skip: int = 0,
    limit: int = 100,
    service: InfoPanelsService = Depends(get_info_panels_service)
):
    return await service.get_all_panels(skip=skip, limit=limit)

@router.get("/{panel_id}", response_model=InfoPanelResponse)
async def get_info_panel(
    panel_id: int,
    service: InfoPanelsService = Depends(get_info_panels_service)
):
    return await service.get_panel_by_id(panel_id)

@router.patch("/{panel_id}", response_model=InfoPanelResponse)
async def update_info_panel(
    panel_id: int,
    panel_data: InfoPanelUpdate,
    service: InfoPanelsService = Depends(get_info_panels_service)
):
    return await service.update_panel(panel_id, panel_data)

@router.delete("/{panel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_info_panel(
    panel_id: int,
    service: InfoPanelsService = Depends(get_info_panels_service)
):
    await service.delete_panel(panel_id)