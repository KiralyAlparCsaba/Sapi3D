from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow CORS for development
origins = [
    "http://localhost:5173",  # your frontend origin
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # or ["*"] to allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/log_load_time")
async def log_load_time(request: Request):
    data = await request.json()
    load_time = data.get("loadTime")
    print(f"📊 Model load-to-visibility: {load_time} ms")
    return {"status": "ok"}

# Mount static files last so it doesn't override API routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")
