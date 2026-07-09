from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from core.database import get_db  
from schemas.user import UserCreate, UserUpdate, UserResponse
from services.user_service import UserService
from core.security import (
    Roles,
    create_access_token,
    get_current_user,
    require_admin,
    require_registered_user,
)

router = APIRouter(
    prefix="/users",
    responses={404: {"description": "Not found"}},
)


def _is_admin(user) -> bool:
    return getattr(user, "role_id", Roles.GUEST) == Roles.ADMIN


def _ensure_self_or_admin(current_user, user_id: int, detail: str) -> None:
    if current_user.user_id != user_id and not _is_admin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


# ---- CREATE USER (admin only — public registration goes through /auth/register) ----
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user (admin only).
    """
    service = UserService(db)
    return await service.create_user(user_data)


# ---- GET ALL USERS (admin only — contains emails / PII) ----
@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a paginated list of all users (admin only).
    """
    service = UserService(db)
    return await service.get_all_users(skip, limit)

# ---- GET USER BY EMAIL (admin only — account enumeration oracle) ----
@router.get("/by-email/{email}", response_model=UserResponse)
async def get_user_by_email(
    email: str,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a user by their email address (admin only).
    """
    service = UserService(db)
    return await service.get_by_email(email)

# ---- GET USER BY USERNAME (admin only) ----
@router.get("/by-username/{username}", response_model=UserResponse)
async def get_user_by_username(
    username: str,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a user by their username (admin only).
    """
    service = UserService(db)
    return await service.get_by_username(username)


# ---- GET USER BY ID (self or admin) ----
@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single user by their ID (own profile, or any user for admins).
    """
    _ensure_self_or_admin(current_user, user_id, "You can only view your own profile")
    service = UserService(db)
    return await service.get_user_by_id(user_id)


# ---- UPDATE USER (with new token) ----
@router.put("/{user_id}", response_model=dict)
async def update_user(
    user_id: int, 
    user_data: UserUpdate, 
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a user by ID and return new JWT token with updated data.

    Only admins may change role_id — it is silently stripped for everyone else.
    """
    _ensure_self_or_admin(current_user, user_id, "You can only update your own profile")

    # Prevent self-service privilege escalation: non-admins cannot change
    # roles. Discard the field from the "set" set so exclude_unset skips it
    # entirely (setting it to None would null the non-nullable column).
    if not _is_admin(current_user):
        user_data.model_fields_set.discard("role_id")

    service = UserService(db)
    updated_user = await service.update_user(user_id, user_data)
    
    # Generate new token with updated data
    new_token = create_access_token({
        "sub": str(updated_user.user_id),
        "username": updated_user.username,
        "role_id": updated_user.role_id,
        "session_id": current_user.session_id
    })
    
    return {
        "user": updated_user,
        "token": new_token
    }


# ---- UPLOAD / REPLACE USER AVATAR ----
@router.api_route("/{user_id}/avatar", methods=["POST", "PUT"], response_model=dict)
async def upload_avatar(
    user_id: int,
    file: UploadFile = File(...),
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload or replace avatar image for a user.

    Rules:
    - Regular users can upload only their own avatar.
    - Admins can upload avatar for any user.
    """
    _ensure_self_or_admin(current_user, user_id, "You can only upload your own avatar")

    file_bytes = await file.read()
    await file.close()

    service = UserService(db)
    updated_user = await service.upload_avatar(
        user_id=user_id,
        file_bytes=file_bytes,
        content_type=file.content_type or ""
    )

    return {
        "user": updated_user
    }


@router.delete("/{user_id}/avatar", response_model=dict)
async def delete_avatar(
    user_id: int,
    current_user=Depends(require_registered_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete avatar image for a user.

    Rules:
    - Regular users can delete only their own avatar.
    - Admins can delete avatar for any user.
    """
    _ensure_self_or_admin(current_user, user_id, "You can only delete your own avatar")

    service = UserService(db)
    updated_user = await service.delete_avatar(user_id=user_id)

    return {
        "user": updated_user
    }


# ---- DELETE USER (admin only) ----
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    _: None = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a user by ID (admin only).
    """
    service = UserService(db)
    await service.delete_user(user_id)
    return None
