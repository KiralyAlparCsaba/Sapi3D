"""
Seed script for seeding achievements and requirements into the database.
Run with: python seed_achievements.py (from backend directory)
"""

import asyncio
import sys
import os
from pathlib import Path

# Set environment variables BEFORE importing app modules
os.environ.setdefault("JWT_SECRET_KEY", "seed_secret_key_for_development_only")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./app/database.db")

# Add app directory to path so imports work correctly
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.achievement import Achievement, AchievementRequirement
from app.models.location import Location, InfoPanel
from app.core.database import Base


# Database configuration
DATABASE_URL = "sqlite+aiosqlite:///./app/database.db"

# Create async engine and session
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_location_by_name(session: AsyncSession, name: str) -> Location:
    """Get a location by its name."""
    result = await session.execute(
        select(Location).filter(Location.name == name)
    )
    return result.scalars().first()


async def get_panel_by_name(session: AsyncSession, name: str) -> InfoPanel:
    """Get a panel by its name."""
    result = await session.execute(
        select(InfoPanel).filter(InfoPanel.name == name)
    )
    return result.scalars().first()


async def get_or_create_achievement(
    session: AsyncSession, name: str, description: str
) -> Achievement:
    """Get or create an achievement."""
    result = await session.execute(
        select(Achievement).filter(Achievement.name == name)
    )
    achievement = result.scalars().first()
    if not achievement:
        achievement = Achievement(name=name, description=description)
        session.add(achievement)
        await session.flush()
    return achievement


async def requirement_exists(
    session: AsyncSession, achievement_id: int, requirement_type: str, requirement_data: dict
) -> bool:
    """Check if a requirement already exists for this achievement."""
    result = await session.execute(
        select(AchievementRequirement).filter(
            AchievementRequirement.achievement_id == achievement_id,
            AchievementRequirement.requirement_type == requirement_type,
            AchievementRequirement.requirement_data == requirement_data,
        )
    )
    return result.scalars().first() is not None


async def seed_achievements():
    """Seed 6 achievements into the database."""
    async with AsyncSessionLocal() as session:
        try:
            # 1. Első lépések - Open model once
            achv1 = await get_or_create_achievement(
                session,
                "Első lépések",
                "Megnyitottad a 3D modellt legalább egyszer"
            )
            if not await requirement_exists(session, achv1.achv_id, "model_view_count", {"count": 1}):
                req1 = AchievementRequirement(
                    achievement_id=achv1.achv_id,
                    requirement_type="model_view_count",
                    requirement_data={"count": 1}
                )
                session.add(req1)
            print("✅ Első lépések")

            # 2. Helyszínvadász I - Visit 3 locations
            achv2 = await get_or_create_achievement(
                session,
                "Helyszínvadász I",
                "Felfedeztél legalább 3 fontos helyszínt"
            )
            if not await requirement_exists(session, achv2.achv_id, "location_count", {"count": 3}):
                req2 = AchievementRequirement(
                    achievement_id=achv2.achv_id,
                    requirement_type="location_count",
                    requirement_data={"count": 3}
                )
                session.add(req2)
            print("✅ Helyszínvadász I")

            # 3. Helyszínvadász II - Visit 5 locations
            achv3 = await get_or_create_achievement(
                session,
                "Helyszínvadász II",
                "Felfedeztél legalább 5 fontos helyszínt"
            )
            if not await requirement_exists(session, achv3.achv_id, "location_count", {"count": 5}):
                req3 = AchievementRequirement(
                    achievement_id=achv3.achv_id,
                    requirement_type="location_count",
                    requirement_data={"count": 5}
                )
                session.add(req3)
            print("✅ Helyszínvadász II")

            # 4. Panelfelfedező - View 5 panels
            achv4 = await get_or_create_achievement(
                session,
                "Panelfelfedező",
                "Információs panelek böngészése a modellben"
            )
            if not await requirement_exists(session, achv4.achv_id, "panel_count", {"count": 5}):
                req4 = AchievementRequirement(
                    achievement_id=achv4.achv_id,
                    requirement_type="panel_count",
                    requirement_data={"count": 5}
                )
                session.add(req4)
            print("✅ Panelfelfedező")

            # 5. Terepszemle - Spend 10 minutes exploring
            achv5 = await get_or_create_achievement(
                session,
                "Terepszemle",
                "Összesen legalább 10 percet töltöttél bejárással"
            )
            if not await requirement_exists(session, achv5.achv_id, "time_spent", {"milliseconds": 600000}):
                req5 = AchievementRequirement(
                    achievement_id=achv5.achv_id,
                    requirement_type="time_spent",
                    requirement_data={"milliseconds": 600000}
                )
                session.add(req5)
            print("✅ Terepszemle")

            # 6. Egyetem turista - Complex achievement with location_any_of
            achv6 = await get_or_create_achievement(
                session,
                "Egyetem turista",
                "Ránéztél a legfontosabb egyetemi pontokra"
            )
            
            # First, find all required locations by name
            aula = await get_location_by_name(session, "Aula")
            konyvtar = await get_location_by_name(session, "Könyvtár")
            informatika = await get_location_by_name(session, "Informatika tanszék")
            gepesz = await get_location_by_name(session, "Gépészmérnöki tanszék")
            villamos = await get_location_by_name(session, "Villamosmérnöki tanszék")
            
            # Add requirements for each location (individual requirements)
            if aula:
                if not await requirement_exists(session, achv6.achv_id, "location", {"location_id": aula.location_id}):
                    req6a = AchievementRequirement(
                        achievement_id=achv6.achv_id,
                        requirement_type="location",
                        requirement_data={"location_id": aula.location_id}
                    )
                    session.add(req6a)
            
            if konyvtar:
                if not await requirement_exists(session, achv6.achv_id, "location", {"location_id": konyvtar.location_id}):
                    req6b = AchievementRequirement(
                        achievement_id=achv6.achv_id,
                        requirement_type="location",
                        requirement_data={"location_id": konyvtar.location_id}
                    )
                    session.add(req6b)
            
            # Add location_any_of requirement for tanszéks
            tanszek_ids = []
            if informatika:
                tanszek_ids.append(informatika.location_id)
            if gepesz:
                tanszek_ids.append(gepesz.location_id)
            if villamos:
                tanszek_ids.append(villamos.location_id)
            
            if tanszek_ids:
                if not await requirement_exists(session, achv6.achv_id, "location_any_of", {"location_ids": tanszek_ids}):
                    req6c = AchievementRequirement(
                        achievement_id=achv6.achv_id,
                        requirement_type="location_any_of",
                        requirement_data={"location_ids": tanszek_ids}
                    )
                    session.add(req6c)
            
            print("✅ Egyetem turista")

            # Commit all changes
            await session.commit()
            print("\n✅ Seeding completed successfully!")

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during seeding: {type(e).__name__}: {e}", file=sys.stderr)
            raise


if __name__ == "__main__":
    asyncio.run(seed_achievements())
