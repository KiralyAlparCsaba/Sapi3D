"""
Seed script for info_panels table.
Reads seed_info_panels.json and upserts all entries.

Run with: python seed_info_panels.py  (from backend directory)
"""

import asyncio
import sys
import os
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse

os.environ.setdefault("JWT_SECRET_KEY", "seed_secret_key_for_development_only")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")

app_dir = Path(__file__).parent / "app"
sys.path.insert(0, str(app_dir))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from models.location import InfoPanel
from core.config import settings

DATABASE_URL = os.environ.get("SEED_DATABASE_URL", settings.database_url)

parsed_url = urlparse(DATABASE_URL)
if parsed_url.query:
    filtered_query = [
        (k, v) for k, v in parse_qsl(parsed_url.query, keep_blank_values=True)
        if k not in ("ssl", "sslmode")
    ]
    if len(filtered_query) != len(parse_qsl(parsed_url.query, keep_blank_values=True)):
        DATABASE_URL = urlunparse(parsed_url._replace(query=urlencode(filtered_query)))

connect_args = {"ssl": False} if DATABASE_URL.startswith("postgresql+asyncpg://") else {}
engine = create_async_engine(DATABASE_URL, echo=False, connect_args=connect_args)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

SEED_FILE = Path(__file__).parent / "seed_info_panels.json"


async def seed():
    if not SEED_FILE.exists():
        print(f"ERROR: {SEED_FILE} not found. Run generate_seed_panels.py first.")
        return

    with open(SEED_FILE, encoding="utf-8") as f:
        entries = json.load(f)

    print(f"Loaded {len(entries)} entries from {SEED_FILE.name}")

    async with AsyncSessionLocal() as session:
        try:
            created = 0
            updated = 0

            for entry in entries:
                obj_name = entry["coordinates_obj_name"]
                information = entry["information"]
                media_url = entry.get("media_url")

                result = await session.execute(
                    select(InfoPanel).where(InfoPanel.coordinates_obj_name == obj_name)
                )
                existing = result.scalars().first()

                if existing:
                    existing.information = information
                    existing.media_url = media_url
                    updated += 1
                else:
                    session.add(InfoPanel(
                        coordinates_obj_name=obj_name,
                        information=information,
                        media_url=media_url,
                    ))
                    created += 1

            await session.commit()
            print(f"\n[OK] Done — {created} created, {updated} updated.")

        except Exception as e:
            await session.rollback()
            print(f"\n❌ Error: {type(e).__name__}: {e}", file=sys.stderr)
            raise


if __name__ == "__main__":
    asyncio.run(seed())
