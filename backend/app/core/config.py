from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # API Settings
    api_title: str = "Sapi3D Backend API"
    api_version: str = "0.2.0"
    api_description: str = "FastAPI backend for Sapi3D application"
    app_version: str = "1.3.0"
    
    # Model Settings
    models_directory: str = "static/models"
    default_model_filename: str = "sapi3D_V1.5.glb"

    # Avatar Upload Settings
    avatars_directory: str = "static/avatars"
    avatar_max_size_bytes: int = 3 * 1024 * 1024  # 3MB
    avatar_allowed_mime_types: List[str] = ["image/jpeg", "image/png"]
    avatar_allowed_extensions: List[str] = ["jpg", "png"]

    # Event Image Upload Settings
    events_directory: str = "static/events"
    event_image_max_size_bytes: int = 5 * 1024 * 1024  # 5MB
    event_image_allowed_mime_types: List[str] = ["image/jpeg", "image/png"]
    event_image_allowed_extensions: List[str] = ["jpg", "png"]
    
    # Database Settings
    database_url: str = "postgresql+asyncpg://sapi3d:sapi3d_password@db:5432/sapi3d"
    database_echo: bool = False          # SQL query logging
    database_pool_size: int = 5          # Connection pool size
    database_max_overflow: int = 10      # Extra connections beyond pool

    
    # CORS Settings
    cors_origins: List[str] = ["*"]
    cors_methods: List[str] = ["*"]
    cors_headers: List[str] = ["*"]
    
    # Logging
    log_level: str = "INFO"

    # JWT Settings - automatically maps to environment variables
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    
    @property
    def model_file_path(self) -> str:
        """Get the full path to the default model file."""
        return f"{self.models_directory}/{self.default_model_filename}"


# Singleton instance
settings = Settings()
