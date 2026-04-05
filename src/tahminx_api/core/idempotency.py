from __future__ import annotations

import asyncio
import copy
import hashlib
import json
import re
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, Optional

IDEMPOTENCY_KEY_PATTERN = re.compile(r"^[A-Za-z0-9:_\-.]+$")


class IdempotencyConflictError(Exception):
    pass


@dataclass
class _InflightEntry:
    fingerprint: str
    task: "asyncio.Task[Any]"


@dataclass
class _CompletedEntry:
    fingerprint: str
    response: Any
    completed_at: float


class AsyncIdempotencyCoordinator:
    def __init__(self, *, ttl_seconds: int = 300, max_entries: int = 1024) -> None:
        self._ttl_seconds = max(1, int(ttl_seconds))
        self._max_entries = max(16, int(max_entries))
        self._lock = asyncio.Lock()
        self._inflight: Dict[str, _InflightEntry] = {}
        self._completed: Dict[str, _CompletedEntry] = {}

    def _cleanup_completed(self) -> None:
        now = time.monotonic()
        expired = [
            key
            for key, entry in self._completed.items()
            if (now - float(entry.completed_at)) > self._ttl_seconds
        ]
        for key in expired:
            self._completed.pop(key, None)

        if len(self._completed) <= self._max_entries:
            return

        ordered = sorted(self._completed.items(), key=lambda item: float(item[1].completed_at))
        prune_count = max(0, len(self._completed) - self._max_entries)
        for key, _ in ordered[:prune_count]:
            self._completed.pop(key, None)

    async def execute(
        self,
        *,
        key: str,
        fingerprint: str,
        operation: Callable[[], Awaitable[Any]],
    ) -> Any:
        task: Optional["asyncio.Task[Any]"] = None
        is_owner = False

        async with self._lock:
            self._cleanup_completed()

            completed = self._completed.get(key)
            if completed is not None:
                if completed.fingerprint != fingerprint:
                    raise IdempotencyConflictError(f"Idempotency key conflict: {key}")
                return copy.deepcopy(completed.response)

            inflight = self._inflight.get(key)
            if inflight is not None:
                if inflight.fingerprint != fingerprint:
                    raise IdempotencyConflictError(f"Idempotency key conflict: {key}")
                task = inflight.task
            else:
                task = asyncio.create_task(operation())
                self._inflight[key] = _InflightEntry(fingerprint=fingerprint, task=task)
                is_owner = True

        try:
            result = await task
        except Exception:
            async with self._lock:
                current = self._inflight.get(key)
                if current is not None and current.task is task:
                    self._inflight.pop(key, None)
            raise

        if is_owner:
            async with self._lock:
                current = self._inflight.get(key)
                if current is not None and current.task is task:
                    self._inflight.pop(key, None)
                    self._completed[key] = _CompletedEntry(
                        fingerprint=fingerprint,
                        response=copy.deepcopy(result),
                        completed_at=time.monotonic(),
                    )

        return copy.deepcopy(result)


def normalize_idempotency_key(raw_key: Optional[str]) -> Optional[str]:
    if raw_key is None:
        return None

    normalized = str(raw_key).strip()
    if not normalized:
        return None

    if len(normalized) < 8 or len(normalized) > 128:
        raise ValueError("Idempotency-Key length must be between 8 and 128.")
    if not IDEMPOTENCY_KEY_PATTERN.fullmatch(normalized):
        raise ValueError("Idempotency-Key can contain only letters, numbers, :, _, -, and .")
    return normalized


def build_fingerprint(payload: Dict[str, Any]) -> str:
    encoded = json.dumps(payload, ensure_ascii=True, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()

