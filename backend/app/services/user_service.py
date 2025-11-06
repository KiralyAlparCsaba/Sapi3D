from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository, RoleRepository
from core.security import hash_password
from schemas.user import UserCreate, UserUpdate, UserResponse
from core.logging import logger

class UserService:
    """Service layer for user management (CRUD)."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)

    # -----------------------
    # CREATE USER
    # -----------------------
    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user with hashed password and assigned role."""
        # Ellenőrzések
        if await self.user_repo.get_by_username(user_data.username):
            raise HTTPException(status_code=400, detail="Username already exists")
        if await self.user_repo.get_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="Email already exists")

        # Role keresése
        role = await self.role_repo.get_by_id(user_data.role_id)
        if not role:
            role = await self.role_repo.get_by_name("user")

        # User létrehozása
        hashed_pw = hash_password(user_data.password)
        user = await self.user_repo.create(
            username=user_data.username,
            email=user_data.email,
            pasw_hash=hashed_pw,
            role_id=role.role_id if role else None,
        )

        await self.db.commit()
        await self.db.refresh(user)
        logger.info(f"Created user: {user.username}")

        return UserResponse.model_validate(user, from_attributes=True)

    # -----------------------
    # GET USER BY ID
    # -----------------------
    async def get_user_by_id(self, user_id: int) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse.model_validate(user, from_attributes=True)

    # -----------------------
    # GET ALL USERS
    # -----------------------
    async def get_all_users(self, skip: int = 0, limit: int = 100):
        users = await self.user_repo.get_all(skip=skip, limit=limit)
        return [UserResponse.model_validate(u, from_attributes=True) for u in users]

    # -----------------------
    # GET USER BY EMAIL
    # -----------------------
    async def get_by_email(self, email: str) -> UserResponse:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse.model_validate(user, from_attributes=True)

    # -----------------------
    # GET USER BY USERNAME
    # -----------------------
    async def get_by_username(self, username: str) -> UserResponse:
        user = await self.user_repo.get_by_username(username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse.model_validate(user, from_attributes=True)

    # -----------------------
    # UPDATE USER
    # -----------------------
    async def update_user(self, user_id: int, data: UserUpdate) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        updated_user = await self.user_repo.update(user_id, **data.model_dump(exclude_unset=True))
        await self.db.commit()
        await self.db.refresh(updated_user)
        logger.info(f"Updated user ID {user_id}")

        return UserResponse.model_validate(updated_user, from_attributes=True)

    # -----------------------
    # DELETE USER
    # -----------------------
    async def delete_user(self, user_id: int) -> bool:
        deleted = await self.user_repo.delete(user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="User not found")

        await self.db.commit()
        logger.info(f"Deleted user ID {user_id}")
        return True
