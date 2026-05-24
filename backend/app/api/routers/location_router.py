from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from core.security import get_current_user
from schemas.location import LocationObjectResponse, LocationCreate, LocationResponse, LocationUpdate
from services.locations_service import LocationsService
from typing import List


router = APIRouter(prefix="/locations")


def _ensure_admin(current_user) -> None:
    if current_user.role_id != 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


@router.get(
    "/location_objects",
    response_model=List[LocationObjectResponse],
    summary="Get Location Objects",
    description="Return all Marker objects from the configured GLB model file.",
)
async def get_location_objects(db: AsyncSession = Depends(get_db)):
    """List available location object names from the 3D model file."""
    service = LocationsService(db)

    try:
        object_names = service.get_location_objects()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to read location objects") from exc

    return [LocationObjectResponse(object_name=name) for name in object_names]


@router.post("/", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(location_data: LocationCreate, db: AsyncSession = Depends(get_db)):
    """Create a new location."""
    service = LocationsService(db)
    return await service.create_location(location_data)


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(location_id: int, db: AsyncSession = Depends(get_db)):
    """Get a location by its ID."""
    service = LocationsService(db)
    return await service.get_location_by_id(location_id)


@router.get("/", response_model=List[LocationResponse])
async def get_locations(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """Get all locations with pagination."""
    service = LocationsService(db)
    return await service.get_all_locations(skip, limit)


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_data: LocationUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing location."""
    service = LocationsService(db)
    return await service.update_location(location_id, location_data)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(location_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a location by its ID."""
    service = LocationsService(db)
    await service.delete_location(location_id)


@router.post("/{location_id}/image", response_model=LocationResponse)
async def upload_location_image(
    location_id: int,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload location cover image (admin only)."""
    _ensure_admin(current_user)
    file_bytes = await file.read()
    await file.close()
    service = LocationsService(db)
    return await service.upload_location_image(
        location_id=location_id,
        file_bytes=file_bytes,
        content_type=file.content_type or "",
    )


@router.put("/{location_id}/image", response_model=LocationResponse)
async def replace_location_image(
    location_id: int,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Replace location cover image (admin only)."""
    _ensure_admin(current_user)
    file_bytes = await file.read()
    await file.close()
    service = LocationsService(db)
    return await service.upload_location_image(
        location_id=location_id,
        file_bytes=file_bytes,
        content_type=file.content_type or "",
    )


@router.delete("/{location_id}/image", response_model=LocationResponse)
async def delete_location_image(
    location_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete location cover image (admin only)."""
    _ensure_admin(current_user)
    service = LocationsService(db)
    return await service.delete_location_image(location_id)
