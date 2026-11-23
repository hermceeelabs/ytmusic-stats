from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from demo_data import generate_demo_data
from takeout_parser import load_takeout_bytes
from ytmusic_service import (
    disconnect_ytmusic,
    get_ytmusic_status,
    setup_ytmusic_auth,
    sync_ytmusic_library,
)

app = FastAPI(title="YouTube Music Stats API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectRequest(BaseModel):
    headers_raw: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/demo")
def get_demo():
    return generate_demo_data()


@app.post("/api/takeout/parse")
async def parse_takeout(
    file: UploadFile = File(...),
    include_youtube_general: bool = Form(False),
):
    try:
        content = await file.read()
        events, stats = load_takeout_bytes(
            file.filename or "watch-history.json",
            content,
            include_youtube_general=include_youtube_general,
        )
        return {"events": events, "stats": stats}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to parse Takeout file: {exc}") from exc


@app.get("/api/ytmusic/status")
def ytmusic_status():
    return get_ytmusic_status()


@app.post("/api/ytmusic/connect")
def ytmusic_connect(req: ConnectRequest):
    try:
        return setup_ytmusic_auth(req.headers_raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/ytmusic/disconnect")
def ytmusic_disconnect():
    disconnect_ytmusic()
    return {"connected": False}


@app.get("/api/ytmusic/sync")
def ytmusic_sync():
    try:
        return sync_ytmusic_library()
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to sync YouTube Music: {exc}") from exc
