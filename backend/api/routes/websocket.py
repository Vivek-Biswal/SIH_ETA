import asyncio
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger
from services.websocket_manager import manager
from models.schemas.frontend import RealtimeEvent

router = APIRouter()

@router.websocket("/ws/trains/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send an initial welcome/connection success event
        welcome_event = RealtimeEvent(
            event_type="INFO",
            train_id="NETWORK",
            timestamp=datetime.utcnow().isoformat() + "Z",
            data_state="live",
            message="Connected to SIH ETA Telemetry Stream"
        )
        await manager.send_personal_message(welcome_event, websocket)
        
        while True:
            # We expect the client to keep the connection alive.
            # Depending on use case, we might receive client events here.
            data = await websocket.receive_text()
            logger.debug(f"Received message from client: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket client disconnected gracefully.")
    except Exception as e:
        manager.disconnect(websocket)
        logger.error(f"WebSocket client connection error: {e}")

# This endpoint is just for testing the broadcast mechanism.
# In production, intelligence services would call manager.broadcast() directly.
@router.post("/api/v1/test-broadcast")
async def test_broadcast(event: RealtimeEvent):
    await manager.broadcast(event)
    return {"status": "broadcasted"}
