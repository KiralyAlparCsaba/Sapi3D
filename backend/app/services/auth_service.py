from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.user_repository import UserRepository, RoleRepository
from repositories.session_repository import SessionRepository, DeviceRepository
from services.email_service import EmailService
from core.config import settings
from core.security import (
    verify_password,
    create_access_token,
    generate_email_verification_code,
    is_verification_code_expired,
    hash_password,
)
from core.device import extract_device_from_user_agent
from schemas.user import (
    UserLogin,
    UserCreate,
    Token,
    MessageResponse,
    RegisterPendingResponse,
    VerifyEmailCodeRequest,
    ResendVerificationCodeRequest,
)
from schemas.session import SessionCreate

class AuthService:
    """Service for authentication (login, register, logout) and session tracking."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.session_repo = SessionRepository(db)
        self.device_repo = DeviceRepository(db)
        self.email_service = EmailService()

    async def login(self, login_data: UserLogin, request: Request) -> Token:
        """Authenticate user, create device, session, and JWT."""
        user = await self.user_repo.get_by_username(login_data.username)
        if not user or not verify_password(login_data.password, user.pasw_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )

        if not user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email address is not verified"
            )

        user_agent = request.headers.get("user-agent")
        device_data = extract_device_from_user_agent(user_agent)

        device = await self.device_repo.create(**device_data)

        session_data = SessionCreate(
            user_id=user.user_id,
            device_id=device.device_id,
            device_type=device_data["device_type"],
            app_version="1.1.0",
            started_at=datetime.now(timezone.utc)
        )
        session = await self.session_repo.create(**session_data.dict())

        token = create_access_token({
            "sub": str(user.user_id),
            "username": user.username,
            "role_id": user.role_id,
            "session_id": session.session_id
        })

        return Token(access_token=token)

    async def logout(self, user_id: int):
        """End any active sessions for this user."""
        active_sessions = await self.session_repo.get_active_sessions(user_id=user_id)
        if not active_sessions:
            raise HTTPException(status_code=404, detail="No active session found")

        for session in active_sessions:
            await self.session_repo.end_session(session.session_id)

        return {"message": "User logged out and session(s) ended."}

    async def register(self, user_data: UserCreate) -> RegisterPendingResponse:
        """Register user and send a 6-digit verification code by email."""
        if await self.user_repo.get_by_username(user_data.username):
            raise HTTPException(status_code=400, detail="Username already exists")
        if await self.user_repo.get_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="Email already exists")

        role = await self.role_repo.get_by_id(user_data.role_id)
        if not role:
            role = await self.role_repo.get_by_name("user")
        if not role:
            raise HTTPException(status_code=500, detail="Default user role not found")

        code = generate_email_verification_code()
        code_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES
        )

        await self.user_repo.create(
            username=user_data.username,
            email=user_data.email,
            pasw_hash=hash_password(user_data.password),
            role_id=role.role_id,
            is_email_verified=False,
            email_verification_code=code,
            email_verification_expires_at=code_expires_at,
        )

        try:
            await self.email_service.send_verification_code(user_data.email, code)
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to send verification email"
            ) from exc

        return RegisterPendingResponse(
            message="Registration successful. Please check your email for the verification code.",
            email=user_data.email,
        )

    async def verify_email_code(self, data: VerifyEmailCodeRequest) -> MessageResponse:
        """Verify email with the 6-digit code and activate user account."""
        user = await self.user_repo.get_by_email(data.email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.is_email_verified:
            return MessageResponse(message="Email is already verified")

        if user.email_verification_code != data.code:
            raise HTTPException(status_code=400, detail="Invalid verification code")

        if is_verification_code_expired(user.email_verification_expires_at):
            raise HTTPException(status_code=400, detail="Verification code has expired")

        await self.user_repo.update(
            user.user_id,
            is_email_verified=True,
            email_verification_code=None,
            email_verification_expires_at=None,
        )

        return MessageResponse(message="Email verified successfully")

    async def resend_verification_code(self, data: ResendVerificationCodeRequest) -> MessageResponse:
        """Generate and resend a fresh verification code for pending users."""
        user = await self.user_repo.get_by_email(data.email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.is_email_verified:
            return MessageResponse(message="Email is already verified")

        new_code = generate_email_verification_code()
        new_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES
        )

        await self.user_repo.update(
            user.user_id,
            email_verification_code=new_code,
            email_verification_expires_at=new_expires_at,
        )

        try:
            await self.email_service.send_verification_code(user.email, new_code)
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to resend verification email"
            ) from exc

        return MessageResponse(message="Verification code sent")
