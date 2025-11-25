from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect

from models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Base repository with common CRUD operations.
    """

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    def _pk(self):
        """Return the primary key column of the model."""
        return inspect(self.model).primary_key[0]

    async def create(self, **kwargs) -> ModelType:
        instance = self.model(**kwargs)
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def get_by_id(self, id: int) -> Optional[ModelType]:
        pk = self._pk()
        result = await self.db.execute(select(self.model).where(pk == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[ModelType]:
        result = await self.db.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def update(self, id: int, **kwargs) -> Optional[ModelType]:
        pk = self._pk()
        await self.db.execute(
            update(self.model).where(pk == id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(id)

    async def delete(self, id: int) -> bool:
        pk = self._pk()
        result = await self.db.execute(
            delete(self.model).where(pk == id)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def exists(self, id: int) -> bool:
        pk = self._pk()
        result = await self.db.execute(select(pk).where(pk == id))
        return result.scalar_one_or_none() is not None
