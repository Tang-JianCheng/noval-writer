from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws/projects/{project_id}")
async def project_websocket(websocket: WebSocket, project_id: str):
    await websocket.accept()
    if project_id not in active_connections:
        active_connections[project_id] = []
    active_connections[project_id].append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections[project_id].remove(websocket)


async def broadcast(project_id: str, event: str, data: dict):
    if project_id in active_connections:
        for ws in active_connections[project_id]:
            try:
                await ws.send_json({"event": event, "data": data})
            except Exception:
                pass
