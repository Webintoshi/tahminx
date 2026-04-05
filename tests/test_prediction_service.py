from __future__ import annotations

import sys
import unittest
from pathlib import Path

from pydantic import ValidationError

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from tahminx_api.domain.prediction.models import AnalyzeRequest
from tahminx_api.domain.prediction.service import PredictionService


class PredictionServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.service = PredictionService(max_bankroll_pct=0.05)

    def test_recommends_positive_edge_outcome(self) -> None:
        payload = AnalyzeRequest(
            match_id="m-100",
            market="1x2",
            bankroll=1000.0,
            min_edge=0.02,
            outcomes=[
                {"outcome": "home", "probability": 0.52, "odds": 2.10},
                {"outcome": "draw", "probability": 0.26, "odds": 3.20},
                {"outcome": "away", "probability": 0.22, "odds": 3.90},
            ],
        )

        result = self.service.analyze(payload)
        self.assertEqual(result.best_outcome, "HOME")
        self.assertGreaterEqual(result.recommended_count, 1)
        self.assertGreater(result.outcomes[0].edge, 0.0)

    def test_no_recommendation_with_high_min_edge(self) -> None:
        payload = AnalyzeRequest(
            match_id="m-101",
            market="1x2",
            bankroll=1000.0,
            min_edge=0.50,
            outcomes=[
                {"outcome": "home", "probability": 0.51, "odds": 2.0},
                {"outcome": "draw", "probability": 0.27, "odds": 3.2},
                {"outcome": "away", "probability": 0.22, "odds": 4.0},
            ],
        )

        result = self.service.analyze(payload)
        self.assertEqual(result.recommended_count, 0)

    def test_probability_sum_validation(self) -> None:
        with self.assertRaises(ValidationError):
            AnalyzeRequest(
                match_id="m-102",
                market="1x2",
                bankroll=1000.0,
                outcomes=[
                    {"outcome": "home", "probability": 0.70, "odds": 1.8},
                    {"outcome": "away", "probability": 0.20, "odds": 4.1},
                ],
            )


if __name__ == "__main__":
    unittest.main()

