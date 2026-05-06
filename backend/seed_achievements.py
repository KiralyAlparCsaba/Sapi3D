"""
Seed script for seeding achievements and requirements into the database.
Run with: python seed_achievements.py (from backend directory)
"""

import asyncio
import sys
import os
from pathlib import Path
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

# Set environment variables BEFORE importing app modules
os.environ.setdefault("JWT_SECRET_KEY", "seed_secret_key_for_development_only")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")

# Add app directory to path so imports work correctly
app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from models.achievement import Achievement, AchievementRequirement
from models.location import Location, InfoPanel
from models.user import User
from models.session import Session
from models.metrics import PerfMetrics
from core.config import settings


# Database configuration — use the same URL as the rest of the app
DATABASE_URL = os.environ.get("SEED_DATABASE_URL", settings.database_url)

# Try to use localhost if db hostname doesn't resolve (for local seed execution)
if "@db:" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("@db:", "@localhost:")

# Remove SSL-related query params that asyncpg does not accept
parsed_url = urlparse(DATABASE_URL)
if parsed_url.query:
    filtered_query = [
        (key, value)
        for key, value in parse_qsl(parsed_url.query, keep_blank_values=True)
        if key not in ("ssl", "sslmode")
    ]
    if len(filtered_query) != len(parse_qsl(parsed_url.query, keep_blank_values=True)):
        DATABASE_URL = urlunparse(parsed_url._replace(query=urlencode(filtered_query)))

# Create async engine and session
connect_args = {"ssl": False} if DATABASE_URL.startswith("postgresql+asyncpg://") else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
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
    session: AsyncSession,
    achv_id: int,
    req_type: str,
    value: int = None,
    location_id: int = None,
    panel_id: int = None,
) -> bool:
    """Check if a requirement already exists for this achievement."""
    filters = [
        AchievementRequirement.achv_id == achv_id,
        AchievementRequirement.req_type == req_type,
    ]
    if location_id is not None:
        filters.append(AchievementRequirement.location_id == location_id)
    if panel_id is not None:
        filters.append(AchievementRequirement.panel_id == panel_id)

    result = await session.execute(
        select(AchievementRequirement).filter(*filters)
    )
    return result.scalars().first() is not None


async def upsert_numeric_requirement(
    session: AsyncSession,
    achv_id: int,
    req_type: str,
    value: int,
) -> None:
    """
    Upsert egy numerikus requirement-et req_type szerint.
    Ha már létezik ilyen típusú requirement (bármilyen value-val), frissíti.
    Ha nem létezik, létrehozza.
    Így elkerüljük a duplikált requirement-eket, ha a seed többször fut.
    """
    result = await session.execute(
        select(AchievementRequirement).filter(
            AchievementRequirement.achv_id == achv_id,
            AchievementRequirement.req_type == req_type,
        )
    )
    existing_reqs = result.scalars().all()

    if existing_reqs:
        # Frissítjük az első, töröljük a duplikáltakat
        first = existing_reqs[0]
        first.value = value
        for duplicate in existing_reqs[1:]:
            await session.delete(duplicate)
        print(f"  [UPSERT] {req_type}={value} (frissítve, {len(existing_reqs)-1} duplikált törölve)")
    else:
        session.add(AchievementRequirement(
            achv_id=achv_id,
            req_type=req_type,
            value=value,
        ))
        print(f"  [CREATE] {req_type}={value}")


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
            await upsert_numeric_requirement(session, achv1.achv_id, "model_view_count", 1)
            print("[OK] Elso lepesek")

            # 2. Helyszínvadász I - Visit 3 locations
            achv2 = await get_or_create_achievement(
                session,
                "Helyszínvadász I",
                "Felfedeztél legalább 3 fontos helyszínt"
            )
            await upsert_numeric_requirement(session, achv2.achv_id, "location_count", 3)
            print("[OK] Helyszinvadasz I")

            # 3. Helyszínvadász II - Visit 5 locations
            achv3 = await get_or_create_achievement(
                session,
                "Helyszínvadász II",
                "Felfedeztél legalább 5 fontos helyszínt"
            )
            await upsert_numeric_requirement(session, achv3.achv_id, "location_count", 5)
            print("[OK] Helyszinvadasz II")

            # 4. Panelfelfedező - View 5 panels
            achv4 = await get_or_create_achievement(
                session,
                "Panelfelfedező",
                "Információs panelek böngészése a modellben"
            )
            await upsert_numeric_requirement(session, achv4.achv_id, "panel_count", 5)
            print("[OK] Panelfelfedezo")

            # 5. Terepszemle - Spend 10 minutes exploring (600 seconds)
            achv5 = await get_or_create_achievement(
                session,
                "Terepszemle",
                "Összesen legalább 10 percet töltöttél bejárással"
            )
            # upsert: ha volt régi value=10 vagy bármilyen más érték, felülírja 600-ra
            # és törli a duplikáltakat
            await upsert_numeric_requirement(session, achv5.achv_id, "time_spent", 600)
            print("[OK] Terepszemle")

            # 6. Egyetem turista - Visit key university locations
            achv6 = await get_or_create_achievement(
                session,
                "Egyetem turista",
                "Ránéztél a legfontosabb egyetemi pontokra"
            )

            # Find all required locations by name
            aula = await get_location_by_name(session, "Aula")
            konyvtar = await get_location_by_name(session, "Könyvtár")
            informatika = await get_location_by_name(session, "Informatika tanszék")
            gepesz = await get_location_by_name(session, "Gépészmérnöki tanszék")
            villamos = await get_location_by_name(session, "Villamosmérnöki tanszék")

            # Require visiting Aula specifically
            if aula:
                if not await requirement_exists(session, achv6.achv_id, "location", location_id=aula.loc_id):
                    session.add(AchievementRequirement(
                        achv_id=achv6.achv_id,
                        req_type="location",
                        location_id=aula.loc_id
                    ))

            # Require visiting Könyvtár specifically
            if konyvtar:
                if not await requirement_exists(session, achv6.achv_id, "location", location_id=konyvtar.loc_id):
                    session.add(AchievementRequirement(
                        achv_id=achv6.achv_id,
                        req_type="location",
                        location_id=konyvtar.loc_id
                    ))

            # Require visiting at least one tanszék (location_any_of stored as JSON)
            tanszek_ids = []
            if informatika:
                tanszek_ids.append(informatika.loc_id)
            if gepesz:
                tanszek_ids.append(gepesz.loc_id)
            if villamos:
                tanszek_ids.append(villamos.loc_id)

            if tanszek_ids:
                # location_any_of uses requirement_data JSON — check by req_type only
                existing = await session.execute(
                    select(AchievementRequirement).filter(
                        AchievementRequirement.achv_id == achv6.achv_id,
                        AchievementRequirement.req_type == "location_any_of"
                    )
                )
                if not existing.scalars().first():
                    session.add(AchievementRequirement(
                        achv_id=achv6.achv_id,
                        req_type="location_any_of",
                        requirement_data={"location_ids": tanszek_ids}
                    ))

            print("[OK] Egyetem turista")

            # Commit all changes
            await session.commit()
            print("\n[OK] Seeding completed successfully!")

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error during seeding: {type(e).__name__}: {e}", file=sys.stderr)
            raise


if __name__ == "__main__":
    asyncio.run(seed_achievements())
