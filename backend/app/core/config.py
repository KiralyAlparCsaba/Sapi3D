from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    """Application settings with environment variable support."""

    api_title: str = "Sapi3D Backend API"
    api_version: str = "0.1.0"
    api_description: str = "FastAPI backend for Sapi3D application"

    models_directory: str = "static/models"
    default_model_filename: str = "sapi3D_V1.4.2.glb"

    avatars_directory: str = "static/avatars"
    avatar_max_size_bytes: int = 3 * 1024 * 1024
    avatar_allowed_mime_types: List[str] = ["image/jpeg", "image/png"]
    avatar_allowed_extensions: List[str] = ["jpg", "png"]

    events_directory: str = "static/events"
    event_image_max_size_bytes: int = 5 * 1024 * 1024
    event_image_allowed_mime_types: List[str] = ["image/jpeg", "image/png"]
    event_image_allowed_extensions: List[str] = ["jpg", "png"]

    database_url: str = "postgresql+asyncpg://sapi3d:sapi3d_password@db:5432/sapi3d"
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10

    cors_origins: List[str] = ["*"]
    cors_methods: List[str] = ["*"]
    cors_headers: List[str] = ["*"]

    log_level: str = "INFO"

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    MAIL_FROM: str = ""
    FRONTEND_URL: str = "http://localhost:3000"
    EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES: int = 3

    @property
    def model_file_path(self) -> str:
        """Get the full path to the default model file."""
        return f"{self.models_directory}/{self.default_model_filename}"

settings = Settings()
