from datetime import datetime
from sqlalchemy import String, Integer, BigInteger, ForeignKey, DateTime, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from models.base import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    msg_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    from_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    to_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_chat_from_to_sent", "from_user_id", "to_user_id", "sent_at"),
        Index("ix_chat_to_from_sent", "to_user_id", "from_user_id", "sent_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<ChatMessage(msg_id={self.msg_id}, "
            f"from={self.from_user_id}, to={self.to_user_id}, "
            f"sent_at={self.sent_at})>"
        )
