from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from models.base import Base


class Achievement(Base):
    """Achievement model for defining game achievements."""
    
    __tablename__ = "achievements"
    
    achv_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    condition: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Relationships
    user_achievements: Mapped[List["UserAchievement"]] = relationship("UserAchievement", back_populates="achievement", cascade="all, delete-orphan")
    achievement_progress: Mapped[List["AchvProgress"]] = relationship("AchvProgress", back_populates="achievement", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Achievement(achv_id={self.achv_id}, name='{self.name}')>"


class UserAchievement(Base):
    """UserAchievement model for tracking unlocked achievements."""
    
    __tablename__ = "user_achievements"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    achv_id: Mapped[int] = mapped_column(Integer, ForeignKey("achievements.achv_id"), nullable=False, index=True)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="user_achievements")
    achievement: Mapped["Achievement"] = relationship("Achievement", back_populates="user_achievements")
    
    def __repr__(self) -> str:
        return f"<UserAchievement(user_id={self.user_id}, achv_id={self.achv_id}, unlocked_at={self.unlocked_at})>"


class AchvProgress(Base):
    """AchvProgress model for tracking detailed achievement progress."""
    
    __tablename__ = "achv_progress"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    achv_id: Mapped[int] = mapped_column(Integer, ForeignKey("achievements.achv_id"), nullable=False, index=True)
    panel_count: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    loc_count: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    time_spent: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)  # in seconds
    distance_walked: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)  # in meters
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="achievement_progress")
    achievement: Mapped["Achievement"] = relationship("Achievement", back_populates="achievement_progress")
    
    def __repr__(self) -> str:
        return f"<AchvProgress(user_id={self.user_id}, achv_id={self.achv_id}, panel_count={self.panel_count})>"
