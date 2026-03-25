from sqlalchemy.ext.asyncio import AsyncSession
from models.location import InfoPanel
from repositories.base import BaseRepository


class InfoPanelsRepository(BaseRepository[InfoPanel]):
    """Repository for InfoPanel model."""

    def __init__(self, db: AsyncSession):
        super().__init__(InfoPanel, db)