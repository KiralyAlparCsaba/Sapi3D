from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.user_repository import UserRepository, RoleRepository
from core.security import hash_password, verify_password
from schemas.user import UserCreate, UserUpdate, UserResponse, UserLogin
from core.logging import logger

class UserService:
    """Service layer for user management and authentication."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)

    async def create_user(self, user_data: UserCreate) -> UserResponse:
        if await self.user_repo.get_by_username(user_data.username):
            raise HTTPException(status_code=400, detail="Username already exists")
        if await self.user_repo.get_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="Email already exists")

        hashed_pw = hash_password(user_data.password)

        role = await self.role_repo.get_by_id(user_data.role_id)
        if not role:
            role = await self.role_repo.get_by_name("user")

        user = await self.user_repo.create(
            username=user_data.username,
            email=user_data.email,
            pasw_hash=hashed_pw,
            role_id=role.role_id if role else None,
        )

        await self.db.commit()
        await self.db.refresh(user)
        logger.info(f"Created user: {user.username}")
        return UserResponse.model_validate(user)

    async def get_user_by_id(self, user_id: int) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse.model_validate(user)

    async def get_all_users(self, skip: int = 0, limit: int = 100):
        users = await self.user_repo.get_all(skip=skip, limit=limit)
        return [UserResponse.model_validate(u) for u in users]

    async def update_user(self, user_id: int, data: UserUpdate) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        updated_user = await self.user_repo.update(user_id, **data.model_dump(exclude_unset=True))
        await self.db.commit()
        await self.db.refresh(updated_user)
        logger.info(f"Updated user ID {user_id}")
        return UserResponse.model_validate(updated_user)

    async def delete_user(self, user_id: int) -> bool:
        deleted = await self.user_repo.delete(user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="User not found")

        await self.db.commit()
        logger.info(f"Deleted user ID {user_id}")
        return True

    async def login_user(self, login_data: UserLogin) -> UserResponse:
        user = await self.user_repo.get_by_username(login_data.username)
        if not user or not verify_password(login_data.password, user.pasw_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        logger.info(f"User logged in: {user.username}")
        return UserResponse.model_validate(user)
