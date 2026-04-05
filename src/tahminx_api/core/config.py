from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_version: str
    environment: str
    max_bankroll_pct: float
    idempotency_ttl_seconds: int


def _env_float(name: str, default_value: float, min_value: float, max_value: float) -> float:
    raw_value = os.getenv(name, str(default_value))
    try:
        parsed = float(raw_value)
    except ValueError as exc:
        raise ValueError(f"Environment variable {name} must be a float.") from exc
    if parsed < min_value or parsed > max_value:
        raise ValueError(f"Environment variable {name} must be between {min_value} and {max_value}.")
    return parsed


def _env_int(name: str, default_value: int, min_value: int, max_value: int) -> int:
    raw_value = os.getenv(name, str(default_value))
    try:
        parsed = int(raw_value)
    except ValueError as exc:
        raise ValueError(f"Environment variable {name} must be an integer.") from exc
    if parsed < min_value or parsed > max_value:
        raise ValueError(f"Environment variable {name} must be between {min_value} and {max_value}.")
    return parsed


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "TahminX Backend"),
        app_version=os.getenv("APP_VERSION", "0.1.0"),
        environment=os.getenv("ENVIRONMENT", "dev"),
        max_bankroll_pct=_env_float("MAX_BANKROLL_PCT", 0.03, 0.001, 0.2),
        idempotency_ttl_seconds=_env_int("IDEMPOTENCY_TTL_SECONDS", 300, 30, 3600),
    )

