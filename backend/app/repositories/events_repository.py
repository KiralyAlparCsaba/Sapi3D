from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.location import Event
from repositories.base import BaseRepository


class EventsRepository(BaseRepository[Event]):
    """Repository for Event model with event-specific queries."""

    def __init__(self, db: AsyncSession):
        super().__init__(Event, db)

    async def get_all_by_location_id(
        self,
        loc_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Event]:
        """Return events belonging to a specific location."""
        result = await self.db.execute(
            select(self.model)
            .where(self.model.loc_id == loc_id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_name_and_location_id(self, name: str, loc_id: int) -> Event | None:
        """Return one event by name inside a specific location."""
        result = await self.db.execute(
            select(self.model).where(
                self.model.name == name,
                self.model.loc_id == loc_id,
            )
        )
        return result.scalars().first()
