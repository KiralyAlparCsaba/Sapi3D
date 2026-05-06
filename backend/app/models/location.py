from sqlalchemy import String, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from models.base import Base


class Location(Base):
    """Location model for physical locations in the game."""
    
    __tablename__ = "locations"
    
    loc_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    button_location: Mapped[str] = mapped_column(String(200), nullable=False)
    information: Mapped[str] = mapped_column(String(1000), nullable=False)
    
    # Relationships
    events: Mapped[List["Event"]] = relationship("Event", back_populates="location", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Location(loc_id={self.loc_id}, name='{self.name}')>"


class Event(Base):
    """Event model for location-based events."""
    
    __tablename__ = "events"
    
    event_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    image_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    loc_id: Mapped[int] = mapped_column(Integer, ForeignKey("locations.loc_id"), nullable=False, index=True)
    
    # Relationships
    location: Mapped["Location"] = relationship("Location", back_populates="events")
    
    def __repr__(self) -> str:
        return f"<Event(event_id={self.event_id}, name='{self.name}', loc_id={self.loc_id})>"


class InfoPanel(Base):
    """InfoPanel model for information panels at locations."""
    
    __tablename__ = "info_panels"
    
    panel_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    information: Mapped[str] = mapped_column(Text, nullable=False)
    coordinates_obj_name: Mapped[str] = mapped_column(String(200), nullable=False)
    media_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    def __repr__(self) -> str:
        return f"<InfoPanel(panel_id={self.panel_id}, coordinates='{self.coordinates_obj_name}')>"
