from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from models.session import Session, Device
from repositories.base import BaseRepository


class SessionRepository(BaseRepository[Session]):
    """Repository for Session model with custom queries."""

    def __init__(self, db: AsyncSession):
        super().__init__(Session, db)

    async def get_by_id(self, session_id: int) -> Optional[Session]:
        """
        Get session by ID.

        Args:
            session_id: Session ID to search for

        Returns:
            Session instance or None if not found
        """
        result = await self.db.execute(
            select(Session).where(Session.session_id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Session]:
        """
        Get all sessions for a user.

        Args:
            user_id: User ID to search for
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of Session instances
        """
        result = await self.db.execute(
            select(Session)
            .where(Session.user_id == user_id)
            .offset(skip)
            .limit(limit)
            .order_by(Session.started_at.desc())
        )
        return list(result.scalars().all())

    async def get_active_sessions(self, user_id: Optional[int] = None) -> List[Session]:
        """
        Get active sessions (ended_at is None).

        Args:
            user_id: Optional user ID to filter by

        Returns:
            List of active Session instances
        """
        query = select(Session).where(Session.ended_at.is_(None))
        if user_id:
            query = query.where(Session.user_id == user_id)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def end_session(self, session_id: int, ended_at: Optional[datetime] = None) -> Optional[Session]:
        """
        End a session by setting ended_at timestamp.

        Args:
            session_id: Session ID to end
            ended_at: Optional timestamp, defaults to now

        Returns:
            Updated Session instance or None if not found
        """
        if ended_at is None:
            ended_at = datetime.now(timezone.utc)

        return await self.update(session_id, ended_at=ended_at)


class DeviceRepository(BaseRepository[Device]):
    """Repository for Device model with custom queries."""

    def __init__(self, db: AsyncSession):
        super().__init__(Device, db)

    async def get_by_id(self, device_id: int) -> Optional[Device]:
        """
        Get device by ID.

        Args:
            device_id: Device ID to search for

        Returns:
            Device instance or None if not found
        """
        result = await self.db.execute(
            select(Device).where(Device.device_id == device_id)
        )
        return result.scalar_one_or_none()

    async def get_by_type(self, device_type: str) -> List[Device]:
        """
        Get all devices by type.

        Args:
            device_type: Device type to search for

        Returns:
            List of Device instances
        """
        result = await self.db.execute(
            select(Device).where(Device.device_type == device_type)
        )
        return list(result.scalars().all())
