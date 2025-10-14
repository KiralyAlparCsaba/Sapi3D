from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # API Settings
    api_title: str = "Sapi3D Backend API"
    api_version: str = "0.1.0"
    api_description: str = "FastAPI backend for Sapi3D application"
    
    # Model Settings
    models_directory: str = "static/models"
    default_model_filename: str = "sapi3D_V1.2.glb"
    
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
    
    @property
    def model_file_path(self) -> str:
        """Get the full path to the default model file."""
        return f"{self.models_directory}/{self.default_model_filename}"


# Singleton instance
settings = Settings()
