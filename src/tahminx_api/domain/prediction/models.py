from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from pydantic import BaseModel, Field, field_validator, model_validator


class OutcomeInput(BaseModel):
    outcome: str = Field(min_length=1, max_length=64)
    probability: float = Field(gt=0.0, le=1.0)
    odds: float = Field(gt=1.0, le=1000.0)

    @field_validator("outcome")
    @classmethod
    def validate_outcome(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise ValueError("Outcome name cannot be empty.")
        return normalized


class AnalyzeRequest(BaseModel):
    match_id: str = Field(min_length=1, max_length=80)
    market: str = Field(min_length=1, max_length=32)
    bankroll: float = Field(gt=0.0, le=1_000_000_000.0)
    min_edge: float = Field(default=0.0, ge=0.0, le=1.0)
    outcomes: List[OutcomeInput] = Field(min_length=2, max_length=20)

    @field_validator("match_id", "market")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise ValueError("Value cannot be blank.")
        return normalized

    @model_validator(mode="after")
    def validate_probabilities(self) -> "AnalyzeRequest":
        unique_outcomes = {outcome.outcome for outcome in self.outcomes}
        if len(unique_outcomes) != len(self.outcomes):
            raise ValueError("Outcomes must be unique.")

        probability_sum = sum(outcome.probability for outcome in self.outcomes)
        if abs(probability_sum - 1.0) > 0.02:
            raise ValueError("Outcome probabilities must sum to 1.0 within +/- 0.02 tolerance.")
        return self


class OutcomeAnalysis(BaseModel):
    outcome: str
    probability: float
    odds: float
    edge: float
    expected_return_pct: float
    kelly_fraction: float
    suggested_stake: float
    recommended: bool


class AnalyzeResponse(BaseModel):
    match_id: str
    market: str
    best_outcome: str
    recommended_count: int
    generated_at: str
    outcomes: List[OutcomeAnalysis]

    @classmethod
    def now_iso(cls) -> str:
        return datetime.now(timezone.utc).isoformat()

