from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # vagy konkrét domain fejlesztéshez
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/model")
async def get_model():
    return FileResponse("models/sapi3Dasynctrigger.glb", media_type="model/gltf-binary")

# Productionban a React build:
#app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")