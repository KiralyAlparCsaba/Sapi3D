from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from core.database import get_db  
from schemas.user import UserCreate, UserUpdate, UserResponse, UserLogin, Token
from services.user_service import UserService
from core.security import get_current_user, create_access_token

router = APIRouter(
    prefix="/users",
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


# ---- UPDATE USER (with new token) ----
@router.put("/{user_id}", response_model=dict)
async def update_user(
    user_id: int, 
    user_data: UserUpdate, 
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a user by ID and return new JWT token with updated data.
    """
    # Ensure user can only update their own profile (or is admin)
    if current_user.user_id != user_id and current_user.role_id != 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )
    
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


# ---- DELETE USER ----
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Delete a user by ID.
    """
    service = UserService(db)
    await service.delete_user(user_id)
    return None


