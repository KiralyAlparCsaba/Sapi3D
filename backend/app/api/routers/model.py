import os
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from core.config import settings
from schemas.model import ModelInfo

router = APIRouter()


# Matches the version tag in a filename like `sapi3D_V1.8.glb` or
# `sapi3D_V1.5.3.glb`. Whatever comes after `V` (digits and dots) is the
# reported model_version.
_VERSION_RE = re.compile(r"_V(\d+(?:\.\d+)*)", re.IGNORECASE)


def _extract_model_version(filename: str) -> str:
    """Return the version string embedded in the model filename, or 'unknown'."""
    match = _VERSION_RE.search(filename)
    return match.group(1) if match else "unknown"


@router.get(
    "/model",
    summary="Download 3D Model",
    description="Download the GLB format 3D building model for use in Three.js applications.",
    responses={
        200: {"description": "GLB model file successfully served"},
        404: {"description": "Model file not found on server"},
    },
)
async def get_model():
    """Serve the GLB model file for 3D visualization."""
    return FileResponse(settings.model_file_path, media_type="model/gltf-binary")


@router.get(
    "/model/info",
    response_model=ModelInfo,
    summary="Get Model Information",
    description="Return metadata about the served 3D building model (filename, size, version, last-modified).",
    responses={
        200: {"description": "Model metadata successfully retrieved"},
        404: {"description": "Model file not found on server"},
    },
)
async def get_model_info():
    """Return the metadata for the currently served model file."""
    model_path = settings.model_file_path

    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail="Model file not found")

    file_stat = os.stat(model_path)
    filename = os.path.basename(model_path)

    return ModelInfo(
        filename=filename,
        file_size=file_stat.st_size,
        content_type="model/gltf-binary",
        model_version=_extract_model_version(filename),
        last_modified=datetime.fromtimestamp(file_stat.st_mtime),
        file_path=model_path,
    )