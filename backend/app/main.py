from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api.routers import health, model, user_router  # 👈 új import
from core.config import settings
from core.logging import logger
from core.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("Initializing database...")
    try:
        await init_db()
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
        {"name": "health", "description": "Health check and system status endpoints"},
        {"name": "model", "description": "3D model file serving and metadata endpoints"},
        {"name": "users", "description": "User management and authentication"},  # 👈 új tag
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

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(model.router, tags=["model"])
app.include_router(user_router.router, tags=["users"])

# Log application startup
logger.info(f"Starting {settings.api_title} v{settings.api_version}")
