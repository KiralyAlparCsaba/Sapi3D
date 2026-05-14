from typing import List, Optional
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.chat import ChatMessage
from repositories.base import BaseRepository


class ChatRepository(BaseRepository[ChatMessage]):
    def __init__(self, db: AsyncSession):
        super().__init__(ChatMessage, db)

    async def save_message(
        self,
        from_user_id: int,
        to_user_id: int,
        text: str,
    ) -> ChatMessage:
        msg = ChatMessage(
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            text=text,
        )
        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def get_conversation(
        self,
        user_a: int,
        user_b: int,
        limit: int = 50,
    ) -> List[ChatMessage]:
        stmt = (
            select(ChatMessage)
            .where(
                or_(
                    and_(
                        ChatMessage.from_user_id == user_a,
                        ChatMessage.to_user_id == user_b,
                    ),
                    and_(
                        ChatMessage.from_user_id == user_b,
                        ChatMessage.to_user_id == user_a,
                    ),
                )
            )
            .order_by(ChatMessage.sent_at.desc(), ChatMessage.msg_id.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = list(result.scalars().all())
        rows.reverse()
        return rows
