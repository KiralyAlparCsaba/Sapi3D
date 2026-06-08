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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("Initializing database...")
    try:
        await init_db()
        os.makedirs(settings.avatars_directory, exist_ok=True)
        os.makedirs(settings.events_directory, exist_ok=True)
        os.makedirs(settings.locations_directory, exist_ok=True)
        os.makedirs(settings.avatars_3d_directory, exist_ok=True)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {type(e).__name__}: {e}", exc_info=True)
        raise
    
    yield
    
    # Shutdown
    logger.info("Closing database connections...")
    await close_db()
    logger.info("Database connections closed")


# Initialize FastAPI app with enhanced OpenAPI/Swagger config
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
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc alternative documentation
    openapi_url="/openapi.json",  # OpenAPI schema
)

# Enable CORS with config
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=settings.cors_methods,
    allow_headers=settings.cors_headers,
)

# Static avatar files
os.makedirs(settings.avatars_directory, exist_ok=True)
app.mount("/static/avatars", StaticFiles(directory=settings.avatars_directory), name="avatars")

# Static event image files
os.makedirs(settings.events_directory, exist_ok=True)
app.mount("/static/events", StaticFiles(directory=settings.events_directory), name="events")

# Static location image files
os.makedirs(settings.locations_directory, exist_ok=True)
app.mount("/static/locations", StaticFiles(directory=settings.locations_directory), name="locations")

# Static 3D avatar files (GLB models + manifest.json + optional thumbnails)
os.makedirs(settings.avatars_3d_directory, exist_ok=True)
app.mount("/static/avatars-3d", StaticFiles(directory=settings.avatars_3d_directory), name="avatars-3d")

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(model.router, tags=["Model"])
app.include_router(user_router.router, tags=["Users"])
app.include_router(auth_router.router, tags=["Auth"])
app.include_router(session_router.router, tags=["Sessions"])
app.include_router(device_router, tags=["Devices"])
app.include_router(location_router.router, tags=["Locations"])
app.include_router(event_router.router, tags=["Events"])
app.include_router(info_panels_router.router, tags=["Info Panels"])
app.include_router(achievement_router.router, tags=["Achievements"])
app.include_router(multiplayer_router.router, tags=["Multiplayer"])
app.include_router(avatars_router.router, tags=["Avatars"])
app.include_router(admin_router.router, tags=["Admin"])



# Log application startup
logger.info(f"Starting {settings.api_title} v{settings.api_version}")
