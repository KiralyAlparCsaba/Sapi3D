from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User, Role
from repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User model with custom queries."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)
    
    async def get_by_username(self, username: str) -> Optional[User]:
        """
        Get user by username.
        
        Args:
            username: Username to search for
            
        Returns:
            User instance or None if not found
        """
        result = await self.db.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email.
        
        Args:
            email: Email to search for
            
        Returns:
            User instance or None if not found
        """
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID (overrides base to use user_id).
        
        Args:
            user_id: User ID to search for
            
        Returns:
            User instance or None if not found
        """
        result = await self.db.execute(
            select(User).where(User.user_id == user_id)
        )
        return result.scalar_one_or_none()


class RoleRepository(BaseRepository[Role]):
    """Repository for Role model with custom queries."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(Role, db)
    
    async def get_by_name(self, role_name: str) -> Optional[Role]:
        """
        Get role by name.
        
        Args:
            role_name: Role name to search for
            
        Returns:
            Role instance or None if not found
        """
        result = await self.db.execute(
            select(Role).where(Role.role_name == role_name)
        )
        return result.scalar_one_or_none()
    
    async def get_by_id(self, role_id: int) -> Optional[Role]:
        """
        Get role by ID (overrides base to use role_id).
        
        Args:
            role_id: Role ID to search for
            
        Returns:
            Role instance or None if not found
        """
        result = await self.db.execute(
            select(Role).where(Role.role_id == role_id)
        )
        return result.scalar_one_or_none()
