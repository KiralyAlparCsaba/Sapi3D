from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_methods=["*"],
    allow_headers=["*"],
)

#serve the GLB model
@app.get("/model")
async def get_model():
    return FileResponse("backend/models/sapi3D_V1.2.glb", media_type="model/gltf-binary")

from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
