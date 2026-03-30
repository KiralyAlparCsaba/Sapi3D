from datetime import datetime, timezone
from fastapi import HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.user_repository import UserRepository, RoleRepository
from repositories.session_repository import SessionRepository, DeviceRepository
from services.user_service import UserService
from core.security import verify_password, create_access_token
from core.device import extract_device_from_user_agent
from schemas.user import UserLogin, UserCreate, Token, UserResponse
from schemas.session import SessionCreate


class AuthService:
    """Service for authentication (login, register, logout) and session tracking."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.user_service = UserService(db)
        self.session_repo = SessionRepository(db)
        self.device_repo = DeviceRepository(db)

    # ───────────────────────────────
    # LOGIN USER + CREATE SESSION + DEVICE
    # ───────────────────────────────
    async def login(self, login_data: UserLogin, request: Request) -> Token:
        """Authenticate user, create device, session, and JWT."""
        user = await self.user_repo.get_by_username(login_data.username)
        if not user or not verify_password(login_data.password, user.pasw_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )

        # 🔹 Extract device info from User-Agent
        user_agent = request.headers.get("user-agent")
        device_data = extract_device_from_user_agent(user_agent)

        # 🔹 Create Device (always new)
        device = await self.device_repo.create(**device_data)

        # 🔹 Create Session
        session_data = SessionCreate(
            user_id=user.user_id,
            device_id=device.device_id,
            device_type=device_data["device_type"],  # optional, legacy
            app_version="1.1.0",
            started_at=datetime.now(timezone.utc)
        )
        session = await self.session_repo.create(**session_data.dict())

        # 🔹 Generate JWT token with session info
        token = create_access_token({
            "sub": str(user.user_id),
            "username": user.username,
            "role_id": user.role_id,
            "session_id": session.session_id
        })

        return Token(access_token=token)

    # ───────────────────────────────
    # LOGOUT USER + END SESSION
    # ───────────────────────────────
    async def logout(self, user_id: int):
        """End any active sessions for this user."""
        active_sessions = await self.session_repo.get_active_sessions(user_id=user_id)
        if not active_sessions:
            raise HTTPException(status_code=404, detail="No active session found")

        for session in active_sessions:
            await self.session_repo.end_session(session.session_id)

        return {"message": "User logged out and session(s) ended."}

    # ───────────────────────────────
    # REGISTER USER
    # ───────────────────────────────
    async def register(self, user_data: UserCreate) -> UserResponse:
        """Register a new user (reuse UserService)."""
        return await self.user_service.create_user(user_data)
