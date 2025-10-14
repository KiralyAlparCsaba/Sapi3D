from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# Location Schemas
class LocationBase(BaseModel):
    """Base schema for Location."""
    name: str = Field(..., max_length=100)
    button_location: str = Field(..., max_length=200)
    information: str = Field(..., max_length=1000)


class LocationCreate(LocationBase):
    """Schema for creating a Location."""
    pass


class LocationUpdate(BaseModel):
    """Schema for updating a Location."""
    name: Optional[str] = Field(None, max_length=100)
    button_location: Optional[str] = Field(None, max_length=200)
    information: Optional[str] = Field(None, max_length=1000)


class LocationResponse(LocationBase):
    """Schema for Location response."""
    loc_id: int
    
    model_config = ConfigDict(from_attributes=True)


# Event Schemas
class EventBase(BaseModel):
    """Base schema for Event."""
    name: str = Field(..., max_length=100)
    description: str = Field(..., max_length=1000)
    image_path: Optional[str] = Field(None, max_length=500)
    loc_id: int


class EventCreate(EventBase):
    """Schema for creating an Event."""
    pass


class EventUpdate(BaseModel):
    """Schema for updating an Event."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    image_path: Optional[str] = Field(None, max_length=500)
    loc_id: Optional[int] = None


class EventResponse(EventBase):
    """Schema for Event response."""
    event_id: int
    
    model_config = ConfigDict(from_attributes=True)


class LocationWithEvents(LocationResponse):
    """Schema for Location response with events."""
    events: List[EventResponse] = []
    
    model_config = ConfigDict(from_attributes=True)


# InfoPanel Schemas
class InfoPanelBase(BaseModel):
    """Base schema for InfoPanel."""
    information: str = Field(..., max_length=2000)
    coordinates_obj_name: str = Field(..., max_length=200)
    media_url: Optional[str] = Field(None, max_length=500)


class InfoPanelCreate(InfoPanelBase):
    """Schema for creating an InfoPanel."""
    pass


class InfoPanelUpdate(BaseModel):
    """Schema for updating an InfoPanel."""
    information: Optional[str] = Field(None, max_length=2000)
    coordinates_obj_name: Optional[str] = Field(None, max_length=200)
    media_url: Optional[str] = Field(None, max_length=500)


class InfoPanelResponse(InfoPanelBase):
    """Schema for InfoPanel response."""
    panel_id: int
    
    model_config = ConfigDict(from_attributes=True)
