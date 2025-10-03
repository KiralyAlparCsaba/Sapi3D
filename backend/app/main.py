from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import health, model
from app.core.config import settings
from app.core.logging import logger

# Initialize FastAPI app with enhanced OpenAPI/Swagger config
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
    openapi_tags=[
        {
            "name": "health",
            "description": "Health check and system status endpoints",
        },
        {
            "name": "model",
            "description": "3D model file serving and metadata endpoints",
        },
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

# Log application startup
logger.info(f"Starting {settings.api_title} v{settings.api_version}")
