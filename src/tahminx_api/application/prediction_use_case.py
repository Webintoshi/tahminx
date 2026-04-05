from __future__ import annotations

from tahminx_api.domain.prediction.models import AnalyzeRequest, AnalyzeResponse
from tahminx_api.domain.prediction.service import PredictionService


class PredictionUseCase:
    def __init__(self, service: PredictionService) -> None:
        self._service = service

    async def execute(self, payload: AnalyzeRequest) -> AnalyzeResponse:
        return self._service.analyze(payload)

