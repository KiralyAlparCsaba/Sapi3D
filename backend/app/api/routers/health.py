from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint for the API."""
    return {"status": "healthy", "service": "sapi3d-backend"}
