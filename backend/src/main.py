from fastapi import FastAPI
from .api.router import api_router
from .api.websocket import router as ws_router

app = FastAPI(title="NovalWriter", version="0.5.0")

app.include_router(api_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
