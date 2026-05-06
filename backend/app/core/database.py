from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from typing import AsyncGenerator

from core.config import settings
from models.base import Base

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_pre_ping=True,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to get database session.
    
    Yields:
        AsyncSession: Database session
    """
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
    """
    Initialize database tables and seed initial data.
    Should be called on application startup.
    """ 
    from core.logging import logger
    
    # Import all models to ensure they are registered with Base
    from models.user import User, Role
    from models.session import Session, Device
    from models.achievement import Achievement, UserAchievement, AchvProgress, AchvProgressPanel, AchvProgressLocation, AchievementRequirement
    from models.location import Location, Event, InfoPanel
    from models.metrics import PerfMetrics
    
    logger.info("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Backward-compatibility patch:
        # legacy databases may still have cpu_gpu_usage from earlier schema.
        # We no longer use that field, so remove it if present.
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
                ALTER TABLE devices ALTER COLUMN device_name DROP NOT NULL;
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
        # info_panels.information: widen from VARCHAR(2000) to TEXT
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
        # Achievement schema backward-compat patches
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
    
    # Seed initial roles if they don't exist
    logger.info("About to call _seed_roles()...")
    await _seed_roles()
    logger.info("_seed_roles() completed")


async def _seed_roles() -> None:
    """Seed initial roles into the database."""
    from core.logging import logger
    
    logger.info("Starting role seeding process...")
    
    try:
        from models.user import Role
        from sqlalchemy import select
        
        logger.info("Imports successful, creating session...")
        
        async with AsyncSessionLocal() as session:
            logger.info("Session created, checking for existing roles...")
            
            # Check if roles already exist
            result = await session.execute(select(Role))
            existing_roles = result.scalars().all()
            
            logger.info(f"Found {len(existing_roles)} existing roles")
            
            if not existing_roles:
                logger.info("No roles found, creating default roles...")
                # Create default roles
                roles = [
                    Role(role_id=1, role_name="user"),
                    Role(role_id=2, role_name="admin"),
                ]
                session.add_all(roles)
                logger.info("Roles added to session, committing...")
                await session.commit()
                logger.info("✅ Successfully seeded initial roles: user (1), admin (2)")
            else:
                logger.info(f"✅ Roles already exist ({len(existing_roles)} roles found), skipping seed")
    except Exception as e:
        logger.error(f"❌ Failed to seed roles: {type(e).__name__}: {e}", exc_info=True)
        # Don't raise - we want the app to start even if seeding fails
        # The error will be logged and visible


async def close_db() -> None:
    """
    Close database connections.
    Should be called on application shutdown.
    """
    await engine.dispose()
