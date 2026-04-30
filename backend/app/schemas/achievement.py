from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# Achievement Schemas
class AchievementBase(BaseModel):
    """Base schema for Achievement."""
    name: str = Field(..., max_length=100)
    description: str = Field(..., max_length=500)
    condition: str = Field(..., max_length=500)


class AchievementCreate(AchievementBase):
    """Schema for creating an Achievement."""
    pass


class AchievementUpdate(BaseModel):
    """Schema for updating an Achievement."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    condition: Optional[str] = Field(None, max_length=500)


class AchievementResponse(AchievementBase):
    """Schema for Achievement response."""
    achv_id: int
    
    model_config = ConfigDict(from_attributes=True)


# UserAchievement Schemas
class UserAchievementBase(BaseModel):
    """Base schema for UserAchievement."""
    user_id: int
    achv_id: int


class UserAchievementCreate(UserAchievementBase):
    """Schema for creating a UserAchievement."""
    unlocked_at: datetime = Field(default_factory=datetime.utcnow)


class UserAchievementResponse(UserAchievementBase):
    """Schema for UserAchievement response."""
    id: int
    unlocked_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserAchievementWithDetails(UserAchievementResponse):
    """Schema for UserAchievement response with achievement details."""
    achievement: AchievementResponse
    
    model_config = ConfigDict(from_attributes=True)


# AchvProgress Schemas
class AchvProgressBase(BaseModel):
    """Base schema for AchvProgress."""
    user_id: int
    achv_id: int
    model_view_count: int = Field(default=0, ge=0)  # model megtekintések száma
    time_spent: int = Field(default=0, ge=0)  # in seconds
    distance_walked: int = Field(default=0, ge=0)  # in meters


class AchvProgressCreate(AchvProgressBase):
    """Schema for creating AchvProgress."""
    pass


class AchvProgressUpdate(BaseModel):
    """Schema for updating AchvProgress."""
    model_view_count: Optional[int] = Field(None, ge=0)
    time_spent: Optional[int] = Field(None, ge=0)
    distance_walked: Optional[int] = Field(None, ge=0)


class AchvProgressResponse(AchvProgressBase):
    """Schema for AchvProgress response."""
    id: int
    
    model_config = ConfigDict(from_attributes=True)


class AchvProgressWithDetails(AchvProgressResponse):
    """Schema for AchvProgress response with achievement details."""
    achievement: AchievementResponse
    
    model_config = ConfigDict(from_attributes=True)


# AchvProgressPanel Schemas
class AchvProgressPanelBase(BaseModel):
    """Base schema for AchvProgressPanel."""
    progress_id: int
    panel_id: int


class AchvProgressPanelCreate(AchvProgressPanelBase):
    """Schema for creating AchvProgressPanel."""
    pass


class AchvProgressPanelResponse(AchvProgressPanelBase):
    """Schema for AchvProgressPanel response."""
    id: int
    
    model_config = ConfigDict(from_attributes=True)


# AchvProgressLocation Schemas
class AchvProgressLocationBase(BaseModel):
    """Base schema for AchvProgressLocation."""
    progress_id: int
    location_id: int


class AchvProgressLocationCreate(AchvProgressLocationBase):
    """Schema for creating AchvProgressLocation."""
    pass


class AchvProgressLocationResponse(AchvProgressLocationBase):
    """Schema for AchvProgressLocation response."""
    id: int
    
    model_config = ConfigDict(from_attributes=True)
