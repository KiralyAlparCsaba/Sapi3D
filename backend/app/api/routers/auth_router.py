from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.auth_service import AuthService
from schemas.user import (
    UserLogin,
    UserCreate,
    Token,
    UserResponse,
    RegisterPendingResponse,
    VerifyEmailCodeRequest,
    ResendVerificationCodeRequest,
    MessageResponse,
)
from core.security import get_current_user, create_access_token

router = APIRouter(prefix="/auth")

@router.post("/register", response_model=RegisterPendingResponse)
async def register_user(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    service = AuthService(db)
    return await service.register(user_data)

@router.post("/verify-email-code", response_model=MessageResponse)
async def verify_email_code(
    payload: VerifyEmailCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify newly registered email with a 6-digit code."""
    service = AuthService(db)
    return await service.verify_email_code(payload)

@router.post("/resend-verification-code", response_model=MessageResponse)
async def resend_verification_code(
    payload: ResendVerificationCodeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Resend a fresh 6-digit verification code."""
    service = AuthService(db)
    return await service.resend_verification_code(payload)

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
    service = AuthService(db)
    return await service.logout(current_user.user_id)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    """Return the currently authenticated user's data."""
    return UserResponse.model_validate(current_user)

@router.post("/refresh-token", response_model=Token)
async def refresh_token(current_user=Depends(get_current_user)):
    """Generate a new token based on current user (used after profile updates)."""
    token = create_access_token({
        "sub": str(current_user.user_id),
        "username": current_user.username,
        "role_id": current_user.role_id,
        "session_id": current_user.session_id
    })

    return Token(access_token=token)
