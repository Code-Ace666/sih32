from typing import Dict, Set
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps centre_id -> Set of WebSockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, centre_id: str, websocket: WebSocket):
        await websocket.accept()
        if centre_id not in self.active_connections:
            self.active_connections[centre_id] = set()
        self.active_connections[centre_id].add(websocket)

    def disconnect(self, centre_id: str, websocket: WebSocket):
        if centre_id in self.active_connections:
            self.active_connections[centre_id].discard(websocket)
            if not self.active_connections[centre_id]:
                del self.active_connections[centre_id]

    async def broadcast_to_centre(self, centre_id: str, message: dict):
        if centre_id in self.active_connections:
            # We iterate over a copy of the set to prevent size change issues
            for connection in list(self.active_connections[centre_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    # Connection might be dead, discard it
                    self.active_connections[centre_id].discard(connection)

manager = ConnectionManager()
