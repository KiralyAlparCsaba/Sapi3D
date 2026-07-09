from datetime import timedelta, datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.auth_service import AuthService
from schemas.user import UserLogin, UserCreate, Token, UserResponse
from core.security import get_current_user, require_registered_user, create_access_token


router = APIRouter(prefix="/auth")


@router.post("/register", response_model=UserResponse)
async def register_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    service = AuthService(db)
    return await service.register(user_data)


@router.post("/login", response_model=Token)
async def login_user(
    login_data: UserLogin,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Login and automatically start a session."""
    service = AuthService(db)
    return await service.login(login_data, request)


@router.post("/logout")
async def logout_user(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout user and end their active session(s)."""
    # Guests have no DB session to end — nothing to do. (Previously the
    # guest user_id=0 was treated as "no filter" and ended EVERY session.)
    if current_user.role_id == 0:
        return {"message": "Guest logged out."}
    service = AuthService(db)
    return await service.logout(current_user.user_id)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    """Return the currently authenticated user's data."""
    return UserResponse.model_validate(current_user)


@router.post("/guest", response_model=Token)
async def guest_login(db: AsyncSession = Depends(get_db)):
    """Issue a short-lived guest JWT (role_id=0) and record the visit."""
    from models.session import GuestLogin
    db.add(GuestLogin(logged_at=datetime.now(timezone.utc)))
    await db.flush()

    token = create_access_token(
        {"sub": "guest", "username": "Vendég", "role_id": 0},
        expires_delta=timedelta(hours=4),
    )
    return Token(access_token=token)


@router.post("/refresh-token", response_model=Token)
async def refresh_token(current_user=Depends(require_registered_user)):
    """Generate a new token based on current user (used after profile updates)."""
    token = create_access_token({
        "sub": str(current_user.user_id),
        "username": current_user.username,
        "role_id": current_user.role_id,
        "session_id": current_user.session_id
    })
    
    return Token(access_token=token)
