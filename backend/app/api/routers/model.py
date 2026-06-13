import os
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from schemas.model import ModelInfo

router = APIRouter()

@router.get(
    "/model",
    summary="Download 3D Model",
    description="Download the GLB format 3D building model for use in Three.js applications.",
    response_description="Returns the GLB model file as binary content",
    responses={
        200: {"description": "GLB model file successfully served"},
        404: {"description": "Model file not found on server"},
    }
)
async def get_model():
    """Serve the GLB model file for 3D visualization."""
    return FileResponse(settings.model_file_path, media_type="model/gltf-binary")

@router.get(
    "/model/info", 
    response_model=ModelInfo,
    summary="Get Model Information",
    description="Retrieve detailed metadata about the 3D building model including file size, version, and last modification date.",
    response_description="Returns comprehensive model metadata",
    responses={
        200: {"description": "Model metadata successfully retrieved"},
        404: {"description": "Model file not found on server"},
    }
)
async def get_model_info():
    """Get comprehensive model file information and metadata."""
    model_path = settings.model_file_path
    
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Model file not found")
    
    file_stat = os.stat(model_path)
    filename = os.path.basename(model_path)
    
    return ModelInfo(
        filename=filename,
        file_size=file_stat.st_size,
        content_type="model/gltf-binary",
        model_version="1.7",  # From filename sapi3D_V1.7.glb
        last_modified=datetime.fromtimestamp(file_stat.st_mtime),
        file_path=model_path
    )
