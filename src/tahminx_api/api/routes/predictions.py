from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException

from tahminx_api.api.dependencies import get_idempotency_coordinator, get_prediction_use_case
from tahminx_api.application.prediction_use_case import PredictionUseCase
from tahminx_api.core.idempotency import (
    AsyncIdempotencyCoordinator,
    IdempotencyConflictError,
    build_fingerprint,
    normalize_idempotency_key,
)
from tahminx_api.domain.prediction.models import AnalyzeRequest, AnalyzeResponse

router = APIRouter(prefix="/api/v1/predictions", tags=["predictions"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_prediction(
    payload: AnalyzeRequest,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    use_case: PredictionUseCase = Depends(get_prediction_use_case),
    coordinator: AsyncIdempotencyCoordinator = Depends(get_idempotency_coordinator),
) -> AnalyzeResponse:
    try:
        normalized_key = normalize_idempotency_key(idempotency_key)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if normalized_key is None:
        return await use_case.execute(payload)

    fingerprint = build_fingerprint(
        {
            "route": "/api/v1/predictions/analyze",
            "match_id": payload.match_id,
            "market": payload.market,
            "bankroll": payload.bankroll,
            "min_edge": payload.min_edge,
            "outcomes": [item.model_dump(mode="json") for item in payload.outcomes],
        }
    )
    scoped_key = f"predict-analyze:{payload.match_id}:{normalized_key}"

    try:
        response = await coordinator.execute(
            key=scoped_key,
            fingerprint=fingerprint,
            operation=lambda: use_case.execute(payload),
        )
    except IdempotencyConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail="Same Idempotency-Key cannot be reused with a different payload for this route.",
        ) from exc

    return AnalyzeResponse.model_validate(response)

