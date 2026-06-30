from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from typing import AsyncGenerator

from core.config import settings
from models.base import Base

engine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_pre_ping=True,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    from core.logging import logger
    
    from models.user import User, Role
    from models.session import Session, Device
    from models.achievement import Achievement, UserAchievement, AchvProgress, AchvProgressPanel, AchvProgressLocation, AchievementRequirement
    from models.location import Location, Event, InfoPanel
    from models.metrics import PerfMetrics
    from models.chat import ChatMessage
    
    logger.info("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'perf_metrics'
                      AND column_name = 'cpu_gpu_usage'
                ) THEN
                    ALTER TABLE perf_metrics
                    DROP COLUMN cpu_gpu_usage;
                END IF;
            END
            $$;
        """))
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'devices' AND column_name = 'browser'
                ) THEN
                    ALTER TABLE devices ADD COLUMN browser VARCHAR(100);
                    UPDATE devices SET browser = device_name WHERE browser IS NULL;
                    ALTER TABLE devices ALTER COLUMN browser SET NOT NULL;
                END IF;
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'devices' AND column_name = 'browser_version'
                ) THEN
                    ALTER TABLE devices ADD COLUMN browser_version VARCHAR(50);
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'devices' AND column_name = 'device_name'
                ) THEN
                    ALTER TABLE devices ALTER COLUMN device_name DROP NOT NULL;
                END IF;
            END
            $$;
        """))
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'perf_metrics'
                      AND column_name = 'samples'
                ) THEN
                    ALTER TABLE perf_metrics
                    ADD COLUMN samples JSONB;
                END IF;
            END
            $$;
        """))
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'perf_metrics'
                      AND column_name = 'load_time_s'
                ) THEN
                    ALTER TABLE perf_metrics
                    ADD COLUMN load_time_s FLOAT;
                END IF;
            END
            $$;
        """))
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'perf_metrics'
                      AND column_name = 'peak_memory_mb'
                ) THEN
                    ALTER TABLE perf_metrics
                    ADD COLUMN peak_memory_mb FLOAT;
                END IF;
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'perf_metrics'
                      AND column_name = 'quality_reductions'
                ) THEN
                    ALTER TABLE perf_metrics
                    ADD COLUMN quality_reductions INTEGER;
                END IF;
            END
            $$;
        """))
        await conn.execute(text("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'info_panels'
                      AND column_name = 'information'
                      AND data_type = 'character varying'
                ) THEN
                    ALTER TABLE info_panels
                    ALTER COLUMN information TYPE TEXT;
                END IF;
            END
            $$;
        """))
        await conn.execute(text("""
            DO $$
            BEGIN
                -- achv_progress.model_view_count
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'achv_progress'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'achv_progress'
                      AND column_name = 'model_view_count'
                ) THEN
                    ALTER TABLE achv_progress
                    ADD COLUMN model_view_count BIGINT NOT NULL DEFAULT 0;
                END IF;
            END
            $$;
        """))
        await conn.execute(text("""
            DO $$
            BEGIN
                -- achievement_requirements.requirement_data (JSONB) — added in achievement system v2
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'achievement_requirements'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'achievement_requirements'
                      AND column_name = 'requirement_data'
                ) THEN
                    ALTER TABLE achievement_requirements
                    ADD COLUMN requirement_data JSONB;
                END IF;

                -- achv_progress.session_start — added for time tracking
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'achv_progress'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'achv_progress'
                      AND column_name = 'session_start'
                ) THEN
                    ALTER TABLE achv_progress
                    ADD COLUMN session_start TIMESTAMPTZ;
                END IF;

                -- achv_progress.distance_walked — added for distance tracking
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_name = 'achv_progress'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'achv_progress'
                      AND column_name = 'distance_walked'
                ) THEN
                    ALTER TABLE achv_progress
                    ADD COLUMN distance_walked BIGINT NOT NULL DEFAULT 0;
                END IF;
            END
            $$;
        """))
    logger.info("Database tables created successfully")
    
    logger.info("About to call _seed_roles()...")
    await _seed_roles()
    logger.info("_seed_roles() completed")


async def _seed_roles() -> None:
    from core.logging import logger
    
    logger.info("Starting role seeding process...")
    
    try:
        from models.user import Role
        from sqlalchemy import select
        
        logger.info("Imports successful, creating session...")
        
        async with AsyncSessionLocal() as session:
            logger.info("Session created, checking for existing roles...")
            
            result = await session.execute(select(Role))
            existing_roles = result.scalars().all()
            
            logger.info(f"Found {len(existing_roles)} existing roles")
            
            if not existing_roles:
                logger.info("No roles found, creating default roles...")
                roles = [
                    Role(role_id=1, role_name="user"),
                    Role(role_id=2, role_name="admin"),
                ]
                session.add_all(roles)
                logger.info("Roles added to session, committing...")
                await session.commit()
                logger.info("Successfully seeded initial roles: user (1), admin (2)")
            else:
                logger.info(
                    f"Roles already exist ({len(existing_roles)} roles found), skipping seed"
                )
    except Exception as e:
        logger.error(
            f"Failed to seed roles: {type(e).__name__}: {e}", exc_info=True
        )


async def close_db() -> None:
    await engine.dispose()
