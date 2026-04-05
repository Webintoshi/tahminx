from __future__ import annotations

from fastapi import Request

from tahminx_api.application.prediction_use_case import PredictionUseCase
from tahminx_api.core.idempotency import AsyncIdempotencyCoordinator


def get_prediction_use_case(request: Request) -> PredictionUseCase:
    return request.app.state.prediction_use_case


def get_idempotency_coordinator(request: Request) -> AsyncIdempotencyCoordinator:
    return request.app.state.idempotency_coordinator

