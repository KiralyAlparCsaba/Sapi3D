from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.achievement_repository import (
    AchievementRepository,
    UserAchievementRepository,
    AchvProgressRepository,
    AchvProgressPanelRepository,
    AchvProgressLocationRepository,
    AchievementRequirementRepository
)
from schemas.achievement import (
    AchievementResponse,
    AchvProgressResponse,
    AchvProgressPanelResponse,
    AchvProgressLocationResponse
)


class AchievementService:
    """Service for achievement logic, unlock conditions, and progress tracking."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.achievement_repo = AchievementRepository(db)
        self.user_achievement_repo = UserAchievementRepository(db)
        self.progress_repo = AchvProgressRepository(db)
        self.panel_repo = AchvProgressPanelRepository(db)
        self.location_repo = AchvProgressLocationRepository(db)
        self.requirement_repo = AchievementRequirementRepository(db)
    
    # ════════════════════════════════════════
    # GET ACHIEVEMENTS
    # ════════════════════════════════════════
    
    async def get_all_achievements(self) -> List[AchievementResponse]:
        """Get all available achievements."""
        achievements = await self.achievement_repo.get_all_achievements()
        return [AchievementResponse.model_validate(a) for a in achievements]
    
    async def get_user_achievements_with_progress(self, user_id: int) -> dict:
        """
        Get all achievements for a user with their progress and unlock status.
        
        Returns:
            {
                "unlocked": [AchievementResponse, ...],
                "in_progress": [{"achievement": AchievementResponse, "progress": AchvProgressResponse}, ...],
                "locked": [AchievementResponse, ...]
            }
        """
        all_achievements = await self.achievement_repo.get_all_achievements()
        unlocked_achievements = await self.user_achievement_repo.get_all_by_user(user_id)
        user_progress = await self.progress_repo.get_all_by_user(user_id)
        
        unlocked_ids = {ua.achv_id for ua in unlocked_achievements}
        progress_by_achv_id = {p.achv_id: p for p in user_progress}
        
        unlocked = []
        in_progress = []
        locked = []
        
        for achievement in all_achievements:
            if achievement.achv_id in unlocked_ids:
                unlocked.append(AchievementResponse.model_validate(achievement))
            elif achievement.achv_id in progress_by_achv_id:
                progress = progress_by_achv_id[achievement.achv_id]
                in_progress.append({
                    "achievement": AchievementResponse.model_validate(achievement),
                    "progress": AchvProgressResponse.model_validate(progress)
                })
            else:
                locked.append(AchievementResponse.model_validate(achievement))
        
        return {
            "unlocked": unlocked,
            "in_progress": in_progress,
            "locked": locked
        }
    
    # ════════════════════════════════════════
    # UNLOCK LOGIC
    # ════════════════════════════════════════
    
    async def check_and_unlock_achievement(self, user_id: int, achv_id: int) -> bool:
        """
        Check if achievement should be unlocked based on progress.
        If unlocked, creates UserAchievement record.
        
        Returns:
            True if newly unlocked, False otherwise
        """
        # Check if already unlocked
        if await self.user_achievement_repo.check_achievement_unlocked(user_id, achv_id):
            return False  # Already unlocked
        
        # Get progress
        progress = await self.progress_repo.get_by_user_and_achievement(user_id, achv_id)
        if not progress:
            return False  # No progress yet
        
        # Check if achievement should be unlocked
        should_unlock = await self._evaluate_unlock_condition(achv_id, progress)
        
        if should_unlock:
            # Create UserAchievement record
            from models.achievement import UserAchievement
            ua = UserAchievement(
                user_id=user_id,
                achv_id=achv_id,
                unlocked_at=datetime.now(timezone.utc)
            )
            self.db.add(ua)
            await self.db.flush()
            return True
        
        return False
    
    async def _evaluate_unlock_condition(self, achv_id: int, progress) -> bool:
        """
        Evaluate if achievement requirements are met.
        Reads from achievement_requirements table.
        
        Returns:
            True if ALL requirements are met, False otherwise
        """
        # Get all requirements for this achievement
        requirements = await self.requirement_repo.get_by_achievement(achv_id)
        
        if not requirements:
            return False  # No requirements = cannot unlock
        
        # Group requirements by type
        by_type = {}
        for req in requirements:
            if req.req_type not in by_type:
                by_type[req.req_type] = []
            by_type[req.req_type].append(req)
        
        # ─── model_view_count requirement ───
        if "model_view_count" in by_type:
            required_value = by_type["model_view_count"][0].value
            if required_value is None or progress.model_view_count < required_value:
                return False
        
        # ─── location_count requirement ───
        if "location_count" in by_type:
            required_value = by_type["location_count"][0].value
            if required_value is None:
                return False
            loc_count = await self.location_repo.get_location_count(progress.id)
            if loc_count < required_value:
                return False
        
        # ─── panel_count requirement ───
        if "panel_count" in by_type:
            required_value = by_type["panel_count"][0].value
            if required_value is None:
                return False
            panel_count = await self.panel_repo.get_panel_count(progress.id)
            if panel_count < required_value:
                return False
        
        # ─── time_spent requirement ───
        if "time_spent" in by_type:
            required_value = by_type["time_spent"][0].value
            if required_value is None or progress.time_spent < required_value:
                return False
        
        # ─── location requirement (specific locations) ───
        if "location" in by_type:
            required_location_ids = [req.location_id for req in by_type["location"] if req.location_id]
            if required_location_ids:
                if not await self.location_repo.has_all_locations(progress.id, required_location_ids):
                    return False
        
        # ─── panel requirement (specific panels) ───
        if "panel" in by_type:
            required_panel_ids = [req.panel_id for req in by_type["panel"] if req.panel_id]
            if required_panel_ids:
                visited_panels = await self.panel_repo.get_all_by_progress(progress.id)
                visited_panel_ids = [p.panel_id for p in visited_panels]
                if not all(pid in visited_panel_ids for pid in required_panel_ids):
                    return False
        
        # All requirements met!
        return True
    
    # ════════════════════════════════════════
    # TRACK EVENTS
    # ════════════════════════════════════════
    
    async def track_model_open(self, user_id: int) -> List[int]:
        """
        Track model open event.
        - Finds achievements requiring model_view_count tracking
        - Creates/updates session_start
        - Returns: List of newly unlocked achievement IDs
        """
        unlocked = []
        
        # Find achievements that track model views
        all_requirements = await self.db.execute(
            self.db.query(AchievementRequirement).filter(
                AchievementRequirement.req_type.in_(["model_view_count"])
            ).statement
        )
        
        # For now, just ensure progress exists for achievement 1 (if it exists)
        # This will be expanded when we have more requirements
        for achv_id in range(1, 7):  # Assuming max 6 achievements for now
            progress = await self.progress_repo.get_or_create_progress(user_id, achv_id)
            
            # Set session start if not already set
            if progress.session_start is None:
                progress.session_start = datetime.now(timezone.utc)
                await self.progress_repo.update(progress.id, session_start=progress.session_start)
        
        return unlocked
    
    async def track_model_close(self, user_id: int) -> List[int]:
        """
        Track model close event.
        - Calculate elapsed time from session_start
        - Add to time_spent
        - Clear session_start
        - Check for unlock
        - Returns: List of newly unlocked achievement IDs
        """
        unlocked = []
        
        user_progress_list = await self.progress_repo.get_all_by_user(user_id)
        
        for progress in user_progress_list:
            if progress.session_start is not None:
                elapsed = (datetime.now(timezone.utc) - progress.session_start).total_seconds()
                new_time_spent = (progress.time_spent or 0) + int(elapsed)
                
                await self.progress_repo.update(
                    progress.id,
                    time_spent=new_time_spent,
                    session_start=None
                )
                
                # Check if unlock
                updated_progress = await self.progress_repo.get_by_id(progress.id)
                if await self.check_and_unlock_achievement(user_id, progress.achv_id):
                    unlocked.append(progress.achv_id)
        
        return unlocked
    
    async def track_location_visit(self, user_id: int, location_id: int) -> List[int]:
        """
        Track location visit.
        - Finds achievements requiring location tracking
        - Adds to achv_progress_locations
        - Check for unlock
        - Returns: List of newly unlocked achievement IDs
        """
        unlocked = []
        
        # Get all achievements that track locations
        all_achievements = await self.achievement_repo.get_all_achievements()
        
        for achievement in all_achievements:
            # Get or create progress
            progress = await self.progress_repo.get_or_create_progress(user_id, achievement.achv_id)
            
            # Add location to progress
            await self.location_repo.add_location(progress.id, location_id)
            
            # Check if unlock
            if await self.check_and_unlock_achievement(user_id, achievement.achv_id):
                unlocked.append(achievement.achv_id)
        
        return unlocked
    
    async def track_panel_view(self, user_id: int, panel_id: int) -> List[int]:
        """
        Track panel view event.
        - Finds achievements requiring panel tracking
        - Adds to achv_progress_panels
        - Check for unlock
        - Returns: List of newly unlocked achievement IDs
        """
        unlocked = []
        
        # Get all achievements that track panels
        all_achievements = await self.achievement_repo.get_all_achievements()
        
        for achievement in all_achievements:
            # Get or create progress
            progress = await self.progress_repo.get_or_create_progress(user_id, achievement.achv_id)
            
            # Add panel to progress
            await self.panel_repo.add_panel(progress.id, panel_id)
            
            # Check if unlock
            if await self.check_and_unlock_achievement(user_id, achievement.achv_id):
                unlocked.append(achievement.achv_id)
        
        return unlocked
    
    # ════════════════════════════════════════
    # PROGRESS DISPLAY
    # ════════════════════════════════════════
    
    async def get_achievement_progress(self, user_id: int, achv_id: int) -> Optional[dict]:
        """
        Get detailed progress for a specific achievement.
        
        Returns:
            {
                "progress": AchvProgressResponse,
                "locations": [AchvProgressLocationResponse, ...],
                "panels": [AchvProgressPanelResponse, ...],
                "visited": 3,
                "required": 5,
                "percentage": 60
            }
        """
        progress = await self.progress_repo.get_by_user_and_achievement(user_id, achv_id)
        if not progress:
            return None
        
        locations = await self.location_repo.get_all_by_progress(progress.id)
        panels = await self.panel_repo.get_all_by_progress(progress.id)
        requirements = await self.requirement_repo.get_by_achievement(achv_id)
        
        # Calculate counts
        visited_locations = len(locations)
        visited_panels = len(panels)
        
        # Group requirements by type
        by_type = {}
        for req in requirements:
            if req.req_type not in by_type:
                by_type[req.req_type] = []
            by_type[req.req_type].append(req)
        
        # Calculate progress info
        visited = 0
        required = 0
        percentage = 0
        
        if "location_count" in by_type:
            required = by_type["location_count"][0].value or 1
            visited = visited_locations
        elif "panel_count" in by_type:
            required = by_type["panel_count"][0].value or 1
            visited = visited_panels
        elif "model_view_count" in by_type:
            required = by_type["model_view_count"][0].value or 1
            visited = progress.model_view_count or 0
        elif "time_spent" in by_type:
            required = by_type["time_spent"][0].value or 1
            visited = progress.time_spent or 0
        elif "location" in by_type:
            required_location_ids = [req.location_id for req in by_type["location"] if req.location_id]
            required = len(required_location_ids)
            visited = visited_locations
        elif "panel" in by_type:
            required_panel_ids = [req.panel_id for req in by_type["panel"] if req.panel_id]
            required = len(required_panel_ids)
            visited = visited_panels
        
        if required > 0:
            percentage = min(100, int((visited / required) * 100))
        
        return {
            "progress": AchvProgressResponse.model_validate(progress),
            "locations": [AchvProgressLocationResponse.model_validate(l) for l in locations],
            "panels": [AchvProgressPanelResponse.model_validate(p) for p in panels],
            "visited": visited,
            "required": required,
            "percentage": percentage
        }
