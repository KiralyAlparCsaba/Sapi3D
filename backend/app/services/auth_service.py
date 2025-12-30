from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository, RoleRepository
from services.user_service import UserService
from core.security import verify_password, create_access_token
from schemas.user import UserLogin, UserCreate, Token, UserResponse


class AuthService:
    """Service for authentication (login, register)."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.user_service = UserService(db)

    async def login(self, login_data: UserLogin) -> Token:
        """Authenticate user and return JWT."""
        user = await self.user_repo.get_by_username(login_data.username)
        if not user or not verify_password(login_data.password, user.pasw_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

        role = await self.role_repo.get_by_id(user.role_id)

        token = create_access_token({
            "sub": str(user.user_id),
            "username": user.username,
            "role_id": user.role_id
        })


        return Token(access_token=token)

    async def register(self, user_data: UserCreate) -> UserResponse:
        """Register a new user (reuse UserService)."""
        return await self.user_service.create_user(user_data)
