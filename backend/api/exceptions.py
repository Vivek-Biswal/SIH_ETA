"""
Global exception classes and FastAPI exception handlers.

Custom exceptions are raised in controllers/services; the handlers
convert them into standardized JSON responses matching the API contract's
ErrorResponse schema.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# ── Custom Exception Classes ─────────────────────────────────────────────────


class AppError(Exception):
    """Base application error."""

    def __init__(self, error: str, message: str, status_code: int = 500):
        self.error = error
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(error="NOT_FOUND", message=message, status_code=404)


class ValidationError(AppError):
    """Raised when request validation fails beyond FastAPI's built-in checks."""

    def __init__(self, message: str = "Invalid request"):
        super().__init__(error="VALIDATION_ERROR", message=message, status_code=400)


class ServiceUnavailableError(AppError):
    """Raised when a downstream service (e.g. intelligence module) is unreachable."""

    def __init__(self, message: str = "Service temporarily unavailable"):
        super().__init__(
            error="SERVICE_UNAVAILABLE", message=message, status_code=503
        )


# ── Exception Handlers ──────────────────────────────────────────────────────


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI app."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.error, "message": exc.message},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        # Log the full traceback in production; return a generic message
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
            },
        )
