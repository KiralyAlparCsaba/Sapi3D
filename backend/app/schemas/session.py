from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# Device Schemas
class DeviceBase(BaseModel):
    """Base schema for Device."""
    device_type: str = Field(..., max_length=50)
    device_name: str = Field(..., max_length=100)
    os_name: str = Field(..., max_length=100)


class DeviceCreate(DeviceBase):
    """Schema for creating a Device."""
    pass


class DeviceResponse(DeviceBase):
    """Schema for Device response."""
    device_id: int
    
    model_config = ConfigDict(from_attributes=True)


# Session Schemas
class SessionBase(BaseModel):
    """Base schema for Session."""
    device_type: Optional[str] = Field(None, max_length=50)
    app_version: Optional[str] = Field(None, max_length=20)


class SessionCreate(SessionBase):
    """Schema for creating a Session."""
    user_id: int
    device_id: Optional[int] = None
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))



class SessionUpdate(BaseModel):
    """Schema for updating a Session."""
    ended_at: Optional[datetime] = None


class SessionResponse(SessionBase):
    """Schema for Session response."""
    session_id: int
    user_id: int
    device_id: Optional[int] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class SessionWithDevice(SessionResponse):
    """Schema for Session response with device information."""
    device: Optional[DeviceResponse] = None
    
    model_config = ConfigDict(from_attributes=True)
