import asyncio
from typing import List, Dict, Set
from fastapi import WebSocket
from loguru import logger
from models.schemas.frontend import RealtimeEvent

class ConnectionManager:
    def __init__(self):
        # Store active connections. Could be partitioned by train_id or global.
        # For simplicity, we use a single global list for the dashboard live feed.
        self.active_connections: List[WebSocket] = []
        # Optionally, map train_id -> Set[WebSocket] for specific subscriptions
        self.room_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, train_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if train_id:
            if train_id not in self.room_connections:
                self.room_connections[train_id] = set()
            self.room_connections[train_id].add(websocket)
        logger.info(f"Client connected. Total active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, train_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if train_id and train_id in self.room_connections:
            if websocket in self.room_connections[train_id]:
                self.room_connections[train_id].remove(websocket)
                if not self.room_connections[train_id]:
                    del self.room_connections[train_id]
        logger.info(f"Client disconnected. Total active connections: {len(self.active_connections)}")

    async def broadcast(self, event: RealtimeEvent):
        """Broadcast an event to all connected clients (e.g., for the global live feed)."""
        payload = event.model_dump()
        disconnected_clients = []
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception as e:
                logger.error(f"Error sending message to client: {e}")
                disconnected_clients.append(connection)
                
        # Clean up dead connections
        for client in disconnected_clients:
            self.disconnect(client)

    async def send_personal_message(self, event: RealtimeEvent, websocket: WebSocket):
        try:
            await websocket.send_json(event.model_dump())
        except Exception as e:
            logger.error(f"Error sending personal message to client: {e}")
            self.disconnect(websocket)

# Global manager instance
manager = ConnectionManager()
