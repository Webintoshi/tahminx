from __future__ import annotations

from tahminx_api.domain.prediction.models import AnalyzeRequest, AnalyzeResponse, OutcomeAnalysis


class PredictionService:
    def __init__(self, *, max_bankroll_pct: float = 0.03) -> None:
        self._max_bankroll_pct = max(0.001, min(0.2, float(max_bankroll_pct)))

    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        analyzed_outcomes = [
            self._analyze_single_outcome(
                probability=outcome.probability,
                odds=outcome.odds,
                outcome_name=outcome.outcome,
                bankroll=request.bankroll,
                min_edge=request.min_edge,
            )
            for outcome in request.outcomes
        ]
        sorted_outcomes = sorted(analyzed_outcomes, key=lambda item: (item.edge, item.probability), reverse=True)
        best = sorted_outcomes[0]
        return AnalyzeResponse(
            match_id=request.match_id,
            market=request.market,
            best_outcome=best.outcome,
            recommended_count=len([item for item in sorted_outcomes if item.recommended]),
            generated_at=AnalyzeResponse.now_iso(),
            outcomes=sorted_outcomes,
        )

    def _analyze_single_outcome(
        self,
        *,
        probability: float,
        odds: float,
        outcome_name: str,
        bankroll: float,
        min_edge: float,
    ) -> OutcomeAnalysis:
        edge = self._calculate_edge(probability=probability, odds=odds)
        kelly_fraction = self._calculate_kelly_fraction(probability=probability, odds=odds)
        capped_fraction = min(kelly_fraction, self._max_bankroll_pct)
        suggested_stake = round(bankroll * capped_fraction, 2)
        recommended = edge >= min_edge and suggested_stake > 0
        return OutcomeAnalysis(
            outcome=outcome_name,
            probability=round(probability, 6),
            odds=round(odds, 6),
            edge=round(edge, 6),
            expected_return_pct=round(edge * 100.0, 4),
            kelly_fraction=round(capped_fraction, 6),
            suggested_stake=suggested_stake,
            recommended=recommended,
        )

    @staticmethod
    def _calculate_edge(*, probability: float, odds: float) -> float:
        return (probability * odds) - 1.0

    @staticmethod
    def _calculate_kelly_fraction(*, probability: float, odds: float) -> float:
        if odds <= 1.0:
            return 0.0
        edge = (probability * odds) - 1.0
        if edge <= 0:
            return 0.0
        return edge / (odds - 1.0)

