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
    from models.achievement import Achievement, UserAchievement, AchvProgress
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
        # Backward-compatibility patch for email verification fields.
        await conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                      AND column_name = 'is_email_verified'
                ) THEN
                    ALTER TABLE users
                    ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                      AND column_name = 'email_verification_code'
                ) THEN
                    ALTER TABLE users
                    ADD COLUMN email_verification_code VARCHAR(6);
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                      AND column_name = 'email_verification_expires_at'
                ) THEN
                    ALTER TABLE users
                    ADD COLUMN email_verification_expires_at TIMESTAMPTZ;
                END IF;

                -- Pending email change fields (verified on new email before applying)
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                      AND column_name = 'pending_email'
                ) THEN
                    ALTER TABLE users
                    ADD COLUMN pending_email VARCHAR(255);
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                      AND column_name = 'pending_email_verification_code'
                ) THEN
                    ALTER TABLE users
                    ADD COLUMN pending_email_verification_code VARCHAR(6);
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                      AND column_name = 'pending_email_expires_at'
                ) THEN
                    ALTER TABLE users
                    ADD COLUMN pending_email_expires_at TIMESTAMPTZ;
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                      AND column_name = 'pending_email_sent_at'
                ) THEN
                    ALTER TABLE users
                    ADD COLUMN pending_email_sent_at TIMESTAMPTZ;
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_indexes
                    WHERE tablename = 'users'
                      AND indexname = 'ix_users_email_verification_code'
                ) THEN
                    CREATE INDEX ix_users_email_verification_code
                    ON users (email_verification_code);
                END IF;
            END
            $$;
        """))
        await conn.execute(text("""
            UPDATE users
            SET is_email_verified = TRUE
            WHERE is_email_verified = FALSE
              AND email_verification_code IS NULL
              AND email_verification_expires_at IS NULL;
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
