from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import os

from repositories.user_repository import UserRepository, RoleRepository
from services.email_service import EmailService
from core.config import settings
from core.security import (
    hash_password,
    generate_email_verification_code,
    is_verification_code_expired,
)
from schemas.user import UserCreate, UserUpdate, UserResponse
from core.logging import logger

class UserService:
    """Service layer for user management (CRUD)."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.role_repo = RoleRepository(db)
        self.email_service = EmailService()

    async def create_user(self, user_data: UserCreate) -> UserResponse:
        """Create a new user with hashed password and assigned role."""

        if await self.user_repo.get_by_username(user_data.username):
            raise HTTPException(status_code=400, detail="Username already exists")
        if await self.user_repo.get_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="Email already exists")

        role = await self.role_repo.get_by_id(user_data.role_id)
        if not role:
            role = await self.role_repo.get_by_name("user")

        hashed_pw = hash_password(user_data.password)
        user = await self.user_repo.create(
            username=user_data.username,
            email=user_data.email,
            pasw_hash=hashed_pw,
            role_id=role.role_id if role else None,
            is_email_verified=True,
            email_verification_code=None,
            email_verification_expires_at=None,
        )

        await self.db.commit()
        await self.db.refresh(user)
        logger.info(f"Created user: {user.username}")

        return UserResponse.model_validate(user, from_attributes=True)

    async def get_user_by_id(self, user_id: int) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse.model_validate(user, from_attributes=True)

    async def get_all_users(self, skip: int = 0, limit: int = 100):
        users = await self.user_repo.get_all(skip=skip, limit=limit)
        return [UserResponse.model_validate(u, from_attributes=True) for u in users]

    async def get_by_email(self, email: str) -> UserResponse:
        user = await self.user_repo.get_by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse.model_validate(user, from_attributes=True)

    async def get_by_username(self, username: str) -> UserResponse:
        user = await self.user_repo.get_by_username(username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse.model_validate(user, from_attributes=True)

    async def update_user(self, user_id: int, data: UserUpdate, current_user) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        updates = data.model_dump(exclude_unset=True)

        is_admin = getattr(current_user, "role_id", None) == 2
        is_self = getattr(current_user, "user_id", None) == user_id

        if is_self and not is_admin:
            updates.pop("email", None)
            updates.pop("role_id", None)

        if is_admin and "email" in updates:
            existing = await self.user_repo.get_by_email(updates["email"])
            if existing and existing.user_id != user_id:
                raise HTTPException(status_code=400, detail="Már szerepel ez az email")

        updated_user = await self.user_repo.update(user_id, **updates)
        try:
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise HTTPException(status_code=400, detail="Username vagy e-mail már létezik") from exc

        await self.db.refresh(updated_user)
        logger.info(f"Updated user ID {user_id}")

        return UserResponse.model_validate(updated_user, from_attributes=True)

    async def request_email_change(self, user_id: int, new_email: str):
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        existing = await self.user_repo.get_by_email(new_email)
        if existing and existing.user_id != user_id:
            raise HTTPException(status_code=400, detail="Már szerepel ez az email")

        code = generate_email_verification_code()
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES
        )
        now = datetime.now(timezone.utc)

        await self.user_repo.update(
            user_id,
            pending_email=new_email,
            pending_email_verification_code=code,
            pending_email_expires_at=expires_at,
            pending_email_sent_at=now,
        )

        try:
            await self.email_service.send_verification_code(new_email, code)
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to send verification email"
            ) from exc

        return {"message": "Verification code sent"}

    async def resend_email_change_code(self, user_id: int):
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user.pending_email:
            raise HTTPException(status_code=400, detail="No pending email change")

        if user.pending_email_sent_at:
            seconds_since = (datetime.now(timezone.utc) - user.pending_email_sent_at).total_seconds()
            if seconds_since < 180:
                raise HTTPException(status_code=429, detail="Please wait before resending the code")

        new_code = generate_email_verification_code()
        new_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES
        )
        now = datetime.now(timezone.utc)

        await self.user_repo.update(
            user_id,
            pending_email_verification_code=new_code,
            pending_email_expires_at=new_expires_at,
            pending_email_sent_at=now,
        )

        try:
            await self.email_service.send_verification_code(user.pending_email, new_code)
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to resend verification email"
            ) from exc

        return {"message": "Verification code sent"}

    async def verify_email_change(self, user_id: int, code: str) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not user.pending_email:
            raise HTTPException(status_code=400, detail="No pending email change")

        if user.pending_email_verification_code != code:
            raise HTTPException(status_code=400, detail="Invalid verification code")

        if is_verification_code_expired(user.pending_email_expires_at):
            raise HTTPException(status_code=400, detail="Verification code has expired")

        existing = await self.user_repo.get_by_email(user.pending_email)
        if existing and existing.user_id != user_id:
            raise HTTPException(status_code=400, detail="Már szerepel ez az email")

        updated = await self.user_repo.update(
            user_id,
            email=user.pending_email,
            pending_email=None,
            pending_email_verification_code=None,
            pending_email_expires_at=None,
            pending_email_sent_at=None,
        )

        try:
            await self.db.commit()
        except IntegrityError as exc:
            await self.db.rollback()
            raise HTTPException(status_code=400, detail="Már szerepel ez az email") from exc

        await self.db.refresh(updated)
        return UserResponse.model_validate(updated, from_attributes=True)

    async def cancel_email_change(self, user_id: int):
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        await self.user_repo.update(
            user_id,
            pending_email=None,
            pending_email_verification_code=None,
            pending_email_expires_at=None,
            pending_email_sent_at=None,
        )
        await self.db.commit()
        return {"message": "Cancelled"}

    async def upload_avatar(self, user_id: int, file_bytes: bytes, content_type: str) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if content_type not in settings.avatar_allowed_mime_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid avatar format. Allowed formats: JPG, PNG"
            )

        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        if len(file_bytes) > settings.avatar_max_size_bytes:
            raise HTTPException(status_code=413, detail="Avatar file is too large. Max size is 3MB")

        extension_by_mime = {
            "image/jpeg": "jpg",
            "image/png": "png",
        }
        extension = extension_by_mime[content_type]
        base_name = f"{user_id:09d}"
        avatar_filename = f"{base_name}.{extension}"

        avatars_dir = settings.avatars_directory
        os.makedirs(avatars_dir, exist_ok=True)

        for allowed_ext in settings.avatar_allowed_extensions:
            candidate = os.path.join(avatars_dir, f"{base_name}.{allowed_ext}")
            if os.path.exists(candidate) and candidate != os.path.join(avatars_dir, avatar_filename):
                try:
                    os.remove(candidate)
                except OSError as exc:
                    logger.warning(f"Failed to remove old avatar file {candidate}: {exc}")

        target_path = os.path.join(avatars_dir, avatar_filename)
        try:
            with open(target_path, "wb") as avatar_file:
                avatar_file.write(file_bytes)
        except OSError as exc:
            logger.error(f"Failed to save avatar for user ID {user_id}: {exc}")
            raise HTTPException(status_code=500, detail="Failed to save avatar")

        avatar_url = f"/static/avatars/{avatar_filename}"
        updated_user = await self.user_repo.update(user_id, avatar_url=avatar_url)
        await self.db.commit()
        await self.db.refresh(updated_user)
        logger.info(f"Uploaded avatar for user ID {user_id}")

        return UserResponse.model_validate(updated_user, from_attributes=True)

    async def delete_avatar(self, user_id: int) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        base_name = f"{user_id:09d}"
        avatars_dir = settings.avatars_directory

        removed_any = False
        for allowed_ext in settings.avatar_allowed_extensions:
            candidate = os.path.join(avatars_dir, f"{base_name}.{allowed_ext}")
            if os.path.exists(candidate):
                try:
                    os.remove(candidate)
                    removed_any = True
                except OSError as exc:
                    logger.warning(f"Failed to remove avatar file {candidate}: {exc}")

        updated_user = await self.user_repo.update(user_id, avatar_url=None)
        await self.db.commit()
        await self.db.refresh(updated_user)
        logger.info(
            f"Deleted avatar for user ID {user_id}. Removed file: {'yes' if removed_any else 'no'}"
        )

        return UserResponse.model_validate(updated_user, from_attributes=True)

    async def delete_user(self, user_id: int) -> bool:
        deleted = await self.user_repo.delete(user_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="User not found")

        await self.db.commit()
        logger.info(f"Deleted user ID {user_id}")
        return True
