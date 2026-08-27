import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.models.database import engine, Base
from app.api import auth, centres, bookings, operator, admin, payments, notifications
from app.websocket.connection_manager import manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# Auto-create tables on startup (no Alembic manual runner needed for fast trial/demo)
try:
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

app = FastAPI(
    title="Smart Farmer Procurement Queue & Tracking Platform (SIH26032)",
    description="Backend API for managing procurement centres, queue booking, payments and real-time alerts.",
    version="1.0.0"
)

# CORS Configuration
origins = [org.strip() for org in settings.CORS_ORIGINS.split(",") if org.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(centres.router)
app.include_router(bookings.router)
app.include_router(operator.router)
app.include_router(admin.router)
app.include_router(payments.router)
app.include_router(notifications.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Smart Farmer Procurement Queue & Tracking Platform (SIH26032)",
        "docs_url": "/docs"
    }

# WebSocket Queue Endpoint
@app.websocket("/api/ws/queue/{centre_id}")
async def websocket_queue_endpoint(websocket: WebSocket, centre_id: str):
    logger.info(f"WebSocket connecting to centre room: {centre_id}")
    await manager.connect(centre_id, websocket)
    try:
        while True:
            # We keep the connection alive. Client can send heartbeat messages.
            data = await websocket.receive_text()
            # Send back a heartbeat acknowledgment
            await websocket.send_json({"type": "PONG", "received": data})
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected from centre room: {centre_id}")
        manager.disconnect(centre_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error on room {centre_id}: {e}")
        manager.disconnect(centre_id, websocket)
