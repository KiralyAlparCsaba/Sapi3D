from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ModelInfo(BaseModel):
    """Model information response schema."""
    filename: str
    file_size: int
    content_type: str = "model/gltf-binary"
    model_version: Optional[str] = None
    last_modified: Optional[datetime] = None
    file_path: str
