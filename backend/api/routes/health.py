from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
@router.get("/api/v1/health")
async def health_check():
    """Service health check — no authentication required."""
    return {
        "status": "healthy",
        "service": "sih-eta-api",
        "version": "1.0.0",
    }

