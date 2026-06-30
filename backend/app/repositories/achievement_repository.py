from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from models.achievement import (
    Achievement,
    UserAchievement,
    AchvProgress,
    AchvProgressPanel,
    AchvProgressLocation,
    AchievementRequirement
)
from repositories.base import BaseRepository


class AchievementRepository(BaseRepository[Achievement]):
    """Repository for Achievement model with custom queries."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(Achievement, db)
    
    async def get_all_achievements(self) -> List[Achievement]:
        """Get all achievements."""
        result = await self.db.execute(select(Achievement))
        return list(result.scalars().all())


class UserAchievementRepository(BaseRepository[UserAchievement]):
    """Repository for UserAchievement model."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(UserAchievement, db)
    
    async def get_by_user_and_achievement(self, user_id: int, achv_id: int) -> Optional[UserAchievement]:
        """Get user achievement by user_id and achv_id."""
        result = await self.db.execute(
            select(UserAchievement).where(
                (UserAchievement.user_id == user_id) & 
                (UserAchievement.achv_id == achv_id)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_all_by_user(self, user_id: int) -> List[UserAchievement]:
        """Get all unlocked achievements for a user."""
        result = await self.db.execute(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
        )
        return list(result.scalars().all())
    
    async def check_achievement_unlocked(self, user_id: int, achv_id: int) -> bool:
        """Check if a user has unlocked an achievement."""
        ua = await self.get_by_user_and_achievement(user_id, achv_id)
        return ua is not None


class AchvProgressRepository(BaseRepository[AchvProgress]):
    """Repository for AchvProgress model."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(AchvProgress, db)
    
    async def get_or_create_progress(self, user_id: int, achv_id: int) -> AchvProgress:
        """Get or create progress for user-achievement pair."""
        result = await self.db.execute(
            select(AchvProgress).where(
                (AchvProgress.user_id == user_id) &
                (AchvProgress.achv_id == achv_id)
            )
        )
        # Use first() instead of scalar_one_or_none() to tolerate any
        # duplicate rows that may have been created by concurrent requests.
        progress = result.scalars().first()

        if not progress:
            progress = await self.create(
                user_id=user_id,
                achv_id=achv_id,
                model_view_count=0,
                time_spent=0,
                distance_walked=0,
                session_start=None
            )
        return progress
    
    async def get_by_user_and_achievement(self, user_id: int, achv_id: int) -> Optional[AchvProgress]:
        """Get progress by user_id and achv_id."""
        result = await self.db.execute(
            select(AchvProgress).where(
                (AchvProgress.user_id == user_id) &
                (AchvProgress.achv_id == achv_id)
            )
        )
        return result.scalars().first()

    async def increment_model_view_count(self, progress_id: int) -> None:
        """Atomically increment model_view_count to avoid read-modify-write races."""
        await self.db.execute(
            update(AchvProgress)
            .where(AchvProgress.id == progress_id)
            .values(model_view_count=AchvProgress.model_view_count + 1)
        )
        await self.db.flush()
    
    async def get_all_by_user(self, user_id: int) -> List[AchvProgress]:
        """Get all progress records for a user."""
        result = await self.db.execute(
            select(AchvProgress).where(AchvProgress.user_id == user_id)
        )
        return list(result.scalars().all())


class AchvProgressPanelRepository(BaseRepository[AchvProgressPanel]):
    """Repository for AchvProgressPanel model (many-to-many)."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(AchvProgressPanel, db)
    
    async def add_panel(self, progress_id: int, panel_id: int) -> AchvProgressPanel:
        """Add a panel to progress (if not already exists)."""
        result = await self.db.execute(
            select(AchvProgressPanel).where(
                (AchvProgressPanel.progress_id == progress_id) & 
                (AchvProgressPanel.panel_id == panel_id)
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing
        
        return await self.create(progress_id=progress_id, panel_id=panel_id)
    
    async def get_all_by_progress(self, progress_id: int) -> List[AchvProgressPanel]:
        """Get all panels for a progress."""
        result = await self.db.execute(
            select(AchvProgressPanel).where(AchvProgressPanel.progress_id == progress_id)
        )
        return list(result.scalars().all())
    
    async def get_panel_count(self, progress_id: int) -> int:
        """Get count of unique panels for a progress."""
        result = await self.db.execute(
            select(AchvProgressPanel).where(AchvProgressPanel.progress_id == progress_id)
        )
        return len(list(result.scalars().all()))


class AchvProgressLocationRepository(BaseRepository[AchvProgressLocation]):
    """Repository for AchvProgressLocation model (many-to-many)."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(AchvProgressLocation, db)
    
    async def add_location(self, progress_id: int, location_id: int) -> AchvProgressLocation:
        """Add a location to progress (if not already exists)."""
        result = await self.db.execute(
            select(AchvProgressLocation).where(
                (AchvProgressLocation.progress_id == progress_id) & 
                (AchvProgressLocation.location_id == location_id)
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing
        
        return await self.create(progress_id=progress_id, location_id=location_id)
    
    async def get_all_by_progress(self, progress_id: int) -> List[AchvProgressLocation]:
        """Get all locations for a progress."""
        result = await self.db.execute(
            select(AchvProgressLocation).where(AchvProgressLocation.progress_id == progress_id)
        )
        return list(result.scalars().all())
    
    async def get_location_count(self, progress_id: int) -> int:
        """Get count of unique locations for a progress."""
        result = await self.db.execute(
            select(AchvProgressLocation).where(AchvProgressLocation.progress_id == progress_id)
        )
        return len(list(result.scalars().all()))
    
    async def get_location_ids(self, progress_id: int) -> List[int]:
        """Get list of location IDs for a progress."""
        result = await self.db.execute(
            select(AchvProgressLocation.location_id).where(
                AchvProgressLocation.progress_id == progress_id
            )
        )
        return list(result.scalars().all())
    
    async def has_all_locations(self, progress_id: int, required_location_ids: List[int]) -> bool:
        """Check if progress has ALL specified locations."""
        visited_ids = await self.get_location_ids(progress_id)
        return all(loc_id in visited_ids for loc_id in required_location_ids)


class AchievementRequirementRepository(BaseRepository[AchievementRequirement]):
    """Repository for AchievementRequirement model."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(AchievementRequirement, db)
    
    async def get_by_achievement(self, achv_id: int) -> List[AchievementRequirement]:
        """Get all requirements for an achievement."""
        result = await self.db.execute(
            select(AchievementRequirement).where(AchievementRequirement.achv_id == achv_id)
        )
        return list(result.scalars().all())
    
    async def get_requirement_value(self, achv_id: int, req_type: str) -> Optional[int]:
        """Get numeric value for a requirement type."""
        result = await self.db.execute(
            select(AchievementRequirement.value).where(
                (AchievementRequirement.achv_id == achv_id) & 
                (AchievementRequirement.req_type == req_type)
            )
        )
        return result.scalar_one_or_none()
    
    async def delete_by_achievement(self, achv_id: int) -> int:
        """Delete all requirements for an achievement. Returns count of deleted rows."""
        result = await self.db.execute(
            select(AchievementRequirement).where(AchievementRequirement.achv_id == achv_id)
        )
        requirements = result.scalars().all()
        count = 0
        for req in requirements:
            await self.delete(req.id)
            count += 1
        return count
