from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from core.database import get_db  
from schemas.user import UserCreate, UserUpdate, UserResponse, UserLogin
from services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)


# ---- CREATE USER ----
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new user.
    """
    service = UserService(db)
    return await service.create_user(user_data)


# ---- GET ALL USERS ----
@router.get("/", response_model=List[UserResponse])
async def get_all_users(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    """
    Get a paginated list of all users.
    """
    service = UserService(db)
    return await service.get_all_users(skip, limit)

# ---- GET USER BY EMAIL ----
@router.get("/by-email/{email}", response_model=UserResponse)
async def get_user_by_email(email: str, db: AsyncSession = Depends(get_db)):
    """
    Get a user by their email address.
    """
    service = UserService(db)
    return await service.get_by_email(email)

# ---- GET USER BY USERNAME ----
@router.get("/by-username/{username}", response_model=UserResponse)
async def get_user_by_username(username: str, db: AsyncSession = Depends(get_db)):
    """
    Get a user by their username.
    """
    service = UserService(db)
    return await service.get_by_username(username)


# ---- GET USER BY ID ----
@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get a single user by their ID.
    """
    service = UserService(db)
    return await service.get_user_by_id(user_id)


# ---- UPDATE USER ----
@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate, db: AsyncSession = Depends(get_db)):
    """
    Update a user by ID.
    """
    service = UserService(db)
    return await service.update_user(user_id, user_data)


# ---- DELETE USER ----
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Delete a user by ID.
    """
    service = UserService(db)
    await service.delete_user(user_id)
    return None


