from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from models.base import Base, TimestampMixin


class Role(Base):
    """Role model for user permissions."""
    
    __tablename__ = "roles"
    
    role_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    
    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="role")
    
    def __repr__(self) -> str:
        return f"<Role(role_id={self.role_id}, role_name='{self.role_name}')>"


class User(Base, TimestampMixin):
    """User model for authentication and profile."""
    
    __tablename__ = "users"
    
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    pasw_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    role_id: Mapped[int] = mapped_column(Integer, ForeignKey("roles.role_id"), nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    email_verification_code: Mapped[Optional[str]] = mapped_column(String(6), nullable=True, index=True)
    email_verification_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Pending email change (verified via code sent to pending_email)
    pending_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    pending_email_verification_code: Mapped[Optional[str]] = mapped_column(String(6), nullable=True)
    pending_email_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    pending_email_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    role: Mapped["Role"] = relationship("Role", back_populates="users")
    sessions: Mapped[List["Session"]] = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    user_achievements: Mapped[List["UserAchievement"]] = relationship("UserAchievement", back_populates="user", cascade="all, delete-orphan")
    achievement_progress: Mapped[List["AchvProgress"]] = relationship("AchvProgress", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<User(user_id={self.user_id}, username='{self.username}', email='{self.email}')>"
