from fastapi import APIRouter, HTTPException
from schemas.location import LocationObjectResponse
from services.locations_service import LocationsService
from typing import List

router = APIRouter(prefix="/locations")

@router.get(
    "/location_objects",
    response_model=List[LocationObjectResponse],
    summary="Get Location Objects",
    description="Return all Marker objects from the configured GLB model file.",
)
async def get_location_objects():
    """List available location object names from the 3D model file."""
    service = LocationsService()

    try:
        object_names = service.get_location_objects()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to read location objects") from exc

    return [LocationObjectResponse(object_name=name) for name in object_names]
    
