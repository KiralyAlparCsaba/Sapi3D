from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from services.auth_service import AuthService
from schemas.user import UserLogin, UserCreate, Token, UserResponse
from core.security import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    service = AuthService(db)
    return await service.register(user_data)


@router.post("/login", response_model=Token)
async def login_user(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login and get JWT token."""
    service = AuthService(db)
    return await service.login(login_data)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user = Depends(get_current_user)):
    """Return the currently authenticated user's data."""
    return UserResponse.model_validate(current_user)
