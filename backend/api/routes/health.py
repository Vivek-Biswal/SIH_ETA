from fastapi import APIRouter
from starlette.concurrency import run_in_threadpool

router = APIRouter(tags=["health"])


@router.get('/api/v1/eta/model')
async def eta_model_information():
    from services.eta_ml import model_information
    return await run_in_threadpool(model_information)


@router.get("/health")
@router.get("/api/v1/health")
async def health_check():
    """Service health check — no authentication required."""
    return {
        "status": "healthy",
        "service": "sih-eta-api",
        "version": "1.0.0",
    }

