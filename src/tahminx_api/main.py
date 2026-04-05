from __future__ import annotations

from fastapi import FastAPI

from tahminx_api.api.routes.health import router as health_router
from tahminx_api.api.routes.predictions import router as prediction_router
from tahminx_api.application.prediction_use_case import PredictionUseCase
from tahminx_api.core.config import get_settings
from tahminx_api.core.errors import register_exception_handlers
from tahminx_api.core.idempotency import AsyncIdempotencyCoordinator
from tahminx_api.core.logging import configure_logging, correlation_middleware
from tahminx_api.domain.prediction.service import PredictionService


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(title=settings.app_name, version=settings.app_version)
    app.middleware("http")(correlation_middleware)
    register_exception_handlers(app)

    prediction_service = PredictionService(max_bankroll_pct=settings.max_bankroll_pct)
    prediction_use_case = PredictionUseCase(prediction_service)
    idempotency_coordinator = AsyncIdempotencyCoordinator(
        ttl_seconds=settings.idempotency_ttl_seconds,
        max_entries=2048,
    )

    app.state.prediction_use_case = prediction_use_case
    app.state.idempotency_coordinator = idempotency_coordinator

    app.include_router(health_router)
    app.include_router(prediction_router)

    return app


app = create_app()

