import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from api.routes import health, stations, trains, network, frontend_compat, websocket
from api.exceptions import register_exception_handlers

app = FastAPI(
    title="SIH ETA API",
    description="Backend API for the SIH ETA Train Status Application",
    version="1.0.0-draft",
)

# Register global exception handlers
register_exception_handlers(app)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers — versioned (v1) endpoints
app.include_router(health.router)
app.include_router(stations.router)
app.include_router(trains.router)
app.include_router(network.router)

# Include routers — frontend compatibility endpoints (/api/*)
app.include_router(frontend_compat.router)

# Include WebSocket router
app.include_router(websocket.router)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.DEBUG,
    )
