from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

app = FastAPI()

@app.post("/log_load_time")
async def log_load_time(request: Request):
    data = await request.json()
    load_time = data.get("loadTime")
    print(f"📊 Model load-to-visibility: {load_time} ms")
    return {"status": "ok"}

# Mount static files last so it doesn't override API routes
app.mount("/", StaticFiles(directory="static", html=True), name="static")
