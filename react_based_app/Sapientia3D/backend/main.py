from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS so your React app can fetch the model
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins; in production, restrict to your domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint to serve the GLB model
@app.get("/model")
async def get_model():
    return FileResponse("backend/models/sapi3Dasynctrigger.glb", media_type="model/gltf-binary")

# Uncomment for production if serving React build via FastAPI
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
