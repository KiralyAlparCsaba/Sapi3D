from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import get_current_user
from services.achievement_service import AchievementService
from repositories.achievement_repository import AchievementRepository, AchievementRequirementRepository
from schemas.user import UserResponse
from schemas.achievement import (
    AchievementResponse,
    AchievementCreate,
    AchievementUpdate,
    AchievementRequirementCreate,
    AchievementRequirementResponse
)

router = APIRouter(prefix="/achievements", tags=["Achievements"])


# ════════════════════════════════════════
# GET ENDPOINTS - Public
# ════════════════════════════════════════

@router.get("", response_model=list[AchievementResponse])
async def get_all_achievements(db: AsyncSession = Depends(get_db)):
    """Get all available achievements."""
    service = AchievementService(db)
    return await service.get_all_achievements()


@router.get("/user/progress")
async def get_user_achievements_with_progress(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get achievements for current user with progress and unlock status."""
    service = AchievementService(db)
    return await service.get_user_achievements_with_progress(current_user.user_id)


@router.get("/{achv_id}/progress")
async def get_achievement_progress(
    achv_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed progress for a specific achievement."""
    service = AchievementService(db)
    progress = await service.get_achievement_progress(current_user.user_id, achv_id)
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No progress found for this achievement"
        )
    
    return progress


# ════════════════════════════════════════
# TRACK ENDPOINTS - User events
# ════════════════════════════════════════

@router.post("/track/model-open")
async def track_model_open(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Track model open event (start session_start)."""
    service = AchievementService(db)
    unlocked = await service.track_model_open(current_user.user_id)
    await db.commit()
    
    return {
        "message": "Model open tracked",
        "newly_unlocked_achievements": unlocked
    }


@router.post("/track/model-close")
async def track_model_close(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Track model close event (calculate elapsed time)."""
    service = AchievementService(db)
    unlocked = await service.track_model_close(current_user.user_id)
    await db.commit()
    
    return {
        "message": "Model close tracked",
        "newly_unlocked_achievements": unlocked
    }


@router.post("/track/location")
async def track_location_visit(
    location_id: int = Query(..., description="Location ID"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Track location visit."""
    service = AchievementService(db)
    unlocked = await service.track_location_visit(current_user.user_id, location_id)
    await db.commit()
    
    return {
        "message": "Location visit tracked",
        "location_id": location_id,
        "newly_unlocked_achievements": unlocked
    }


@router.post("/track/panel")
async def track_panel_view(
    panel_id: int = Query(..., description="Panel ID"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Track panel view event."""
    service = AchievementService(db)
    unlocked = await service.track_panel_view(current_user.user_id, panel_id)
    await db.commit()
    
    return {
        "message": "Panel view tracked",
        "panel_id": panel_id,
        "newly_unlocked_achievements": unlocked
    }


# ════════════════════════════════════════
# CRUD ENDPOINTS - Admin
# ════════════════════════════════════════

@router.post("", response_model=AchievementResponse, status_code=status.HTTP_201_CREATED)
async def create_achievement(
    achievement: AchievementCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new achievement (Admin only).
    
    Example request body:
    {
        "name": "Első lépések",
        "description": "Nyiss meg egy modellt"
    }
    """
    # TODO: Check if user is admin
    repo = AchievementRepository(db)
    new_achievement = await repo.create(**achievement.dict())
    await db.commit()
    return AchievementResponse.model_validate(new_achievement)


@router.put("/{achv_id}", response_model=AchievementResponse)
async def update_achievement(
    achv_id: int,
    achievement: AchievementUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an achievement (Admin only).
    
    Example request body:
    {
        "name": "Első lépések - Updated"
    }
    """
    # TODO: Check if user is admin
    repo = AchievementRepository(db)
    updated = await repo.update(achv_id, **achievement.dict(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Achievement not found")
    await db.commit()
    return AchievementResponse.model_validate(updated)


@router.delete("/{achv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_achievement(
    achv_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an achievement (Admin only)."""
    # TODO: Check if user is admin
    repo = AchievementRepository(db)
    success = await repo.delete(achv_id)
    if not success:
        raise HTTPException(status_code=404, detail="Achievement not found")
    await db.commit()


# ════════════════════════════════════════
# REQUIREMENTS ENDPOINTS - Admin
# ════════════════════════════════════════

@router.post("/{achv_id}/requirements", response_model=list[AchievementRequirementResponse], status_code=status.HTTP_201_CREATED)
async def add_achievement_requirements(
    achv_id: int,
    req_type: str = Query(..., description="Requirement type: 'model_view_count', 'location_count', 'panel_count', 'time_spent', 'location', 'panel'"),
    value: int = Query(None, description="Numeric value (for numeric types)"),
    location_ids: list[int] = Query(None, description="Location IDs (for 'location' type)"),
    panel_ids: list[int] = Query(None, description="Panel IDs (for 'panel' type)"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add requirements to an achievement (Admin only).
    
    Examples:
    - model_view_count: POST /achievements/1/requirements?req_type=model_view_count&value=1
    - location_count: POST /achievements/2/requirements?req_type=location_count&value=3
    - specific locations: POST /achievements/6/requirements?req_type=location&location_ids=2&location_ids=8&location_ids=15
    """
    # TODO: Check if user is admin
    repo = AchievementRequirementRepository(db)
    achievement_repo = AchievementRepository(db)
    
    # Check if achievement exists
    achievement = await achievement_repo.get_by_id(achv_id)
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    
    # Validate req_type
    valid_types = ["model_view_count", "location_count", "panel_count", "time_spent", "location", "panel"]
    if req_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid req_type. Must be one of: {', '.join(valid_types)}"
        )
    
    created_requirements = []
    
    # Handle numeric requirements
    if req_type in ["model_view_count", "location_count", "panel_count", "time_spent"]:
        if value is None:
            raise HTTPException(
                status_code=400,
                detail=f"'value' is required for req_type '{req_type}'"
            )
        req = await repo.create(achv_id=achv_id, req_type=req_type, value=value)
        created_requirements.append(req)
    
    # Handle location requirements
    elif req_type == "location":
        if not location_ids:
            raise HTTPException(
                status_code=400,
                detail="'location_ids' is required for req_type 'location'"
            )
        for loc_id in location_ids:
            req = await repo.create(achv_id=achv_id, req_type=req_type, location_id=loc_id)
            created_requirements.append(req)
    
    # Handle panel requirements
    elif req_type == "panel":
        if not panel_ids:
            raise HTTPException(
                status_code=400,
                detail="'panel_ids' is required for req_type 'panel'"
            )
        for panel_id in panel_ids:
            req = await repo.create(achv_id=achv_id, req_type=req_type, panel_id=panel_id)
            created_requirements.append(req)
    
    await db.commit()
    return [AchievementRequirementResponse.model_validate(r) for r in created_requirements]


@router.get("/{achv_id}/requirements", response_model=list[AchievementRequirementResponse])
async def get_achievement_requirements(
    achv_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all requirements for an achievement."""
    repo = AchievementRequirementRepository(db)
    requirements = await repo.get_by_achievement(achv_id)
    return [AchievementRequirementResponse.model_validate(r) for r in requirements]


@router.delete("/{achv_id}/requirements", status_code=status.HTTP_204_NO_CONTENT)
async def clear_achievement_requirements(
    achv_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear all requirements for an achievement (Admin only)."""
    # TODO: Check if user is admin
    repo = AchievementRequirementRepository(db)
    count = await repo.delete_by_achievement(achv_id)
    await db.commit()
    
    return {
        "message": f"Cleared {count} requirements for achievement {achv_id}"
    }
