from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from api.routers import health, model, user_router, auth_router, session_router, location_router, event_router, info_panels_router, achievement_router, multiplayer_router, avatars_router, admin_router
from core.config import settings
from core.logging import logger
from core.database import init_db, close_db
from api.routers.device_router import router as device_router


STATIC_DIRECTORIES = (
    settings.avatars_directory,
    settings.events_directory,
    settings.locations_directory,
    settings.avatars_3d_directory,
)

# Create static directories at import time so the StaticFiles mount validates
# successfully — mount runs before the lifespan startup hook.
for _directory in STATIC_DIRECTORIES:
    os.makedirs(_directory, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hooks: initialize and close the database connection."""
    logger.info("Initializing database...")
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(
            f"Failed to initialize database: {type(e).__name__}: {e}",
            exc_info=True,
        )
        raise

    yield

    logger.info("Closing database connections...")
    await close_db()
    logger.info("Database connections closed")


app = FastAPI(
    lifespan=lifespan,
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
    openapi_tags=[
        {"name": "Health", "description": "Health check and system status endpoints"},
        {"name": "Model", "description": "3D model file serving and metadata endpoints"},
        {"name": "Users", "description": "User management and authentication"},
        {"name": "Locations", "description": "Location domain and model object endpoints"},
        {"name": "Events", "description": "Event management and location-bound event endpoints"},
        {"name": "Devices", "description": "Device management endpoints"},
        {"name": "Sessions", "description": "Session management and performance metrics endpoints"},
        {"name": "Auth", "description": "Authentication and authorization endpoints"},
        {"name": "Info Panels", "description": "Info Panel management and endpoints"},
        {"name": "Achievements", "description": "Achievement system and progress tracking"},
        {"name": "Multiplayer", "description": "Realtime multiplayer presence over WebSocket"},
        {"name": "Avatars", "description": "3D avatar variants for multiplayer rendering (manifest + GLB files)"},
        {"name": "Admin", "description": "Admin-only dashboard aggregation endpoints"}
    ],
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)

app.mount(
    "/static/avatars",
    StaticFiles(directory=settings.avatars_directory),
    name="avatars",
)
app.mount(
    "/static/events",
    StaticFiles(directory=settings.events_directory),
    name="events",
)
app.mount(
    "/static/locations",
    StaticFiles(directory=settings.locations_directory),
    name="locations",
)
app.mount(
    "/static/avatars-3d",
    StaticFiles(directory=settings.avatars_3d_directory),
    name="avatars-3d",
)

ROUTERS = (
    (health.router, "Health"),
    (model.router, "Model"),
    (user_router.router, "Users"),
    (auth_router.router, "Auth"),
    (session_router.router, "Sessions"),
    (device_router, "Devices"),
    (location_router.router, "Locations"),
    (event_router.router, "Events"),
    (info_panels_router.router, "Info Panels"),
    (achievement_router.router, "Achievements"),
    (multiplayer_router.router, "Multiplayer"),
    (avatars_router.router, "Avatars"),
    (admin_router.router, "Admin"),
)
for router, tag in ROUTERS:
    app.include_router(router, tags=[tag])

logger.info(f"Starting {settings.api_title} v{settings.api_version}")