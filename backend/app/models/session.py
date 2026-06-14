from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List

from models.base import Base


class Device(Base):
    """Device model for tracking user devices."""

    __tablename__ = "devices"

    device_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_type: Mapped[str] = mapped_column(String(50), nullable=False)
    browser: Mapped[str] = mapped_column(String(100), nullable=False)
    browser_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    os_name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Relationships
    sessions: Mapped[List["Session"]] = relationship("Session", back_populates="device")
    
    def __repr__(self) -> str:
        return f"<Device(device_id={self.device_id}, device_type='{self.device_type}', device_name='{self.device_name}')>"


class Session(Base):
    """Session model for tracking user sessions."""
    
    __tablename__ = "sessions"
    
    session_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    device_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("devices.device_id"), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    device_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    app_version: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")
    device: Mapped[Optional["Device"]] = relationship("Device", back_populates="sessions")
    perf_metrics: Mapped[List["PerfMetrics"]] = relationship("PerfMetrics", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Session(session_id={self.session_id}, user_id={self.user_id}, started_at={self.started_at})>"


class GuestLogin(Base):
    """Lightweight record inserted each time a guest token is issued."""

    __tablename__ = "guest_logins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    def __repr__(self) -> str:
        return f"<GuestLogin(id={self.id}, logged_at={self.logged_at})>"
