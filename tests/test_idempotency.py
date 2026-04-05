from __future__ import annotations

import asyncio
import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from tahminx_api.core.idempotency import (
    AsyncIdempotencyCoordinator,
    IdempotencyConflictError,
    build_fingerprint,
    normalize_idempotency_key,
)


class IdempotencyCoordinatorTests(unittest.IsolatedAsyncioTestCase):
    async def test_coalesces_concurrent_requests(self) -> None:
        coordinator = AsyncIdempotencyCoordinator(ttl_seconds=120, max_entries=100)
        run_count = 0

        async def operation() -> dict[str, int]:
            nonlocal run_count
            run_count += 1
            await asyncio.sleep(0.02)
            return {"value": run_count}

        results = await asyncio.gather(
            coordinator.execute(key="k1", fingerprint="f1", operation=operation),
            coordinator.execute(key="k1", fingerprint="f1", operation=operation),
            coordinator.execute(key="k1", fingerprint="f1", operation=operation),
        )

        self.assertEqual(run_count, 1)
        self.assertEqual(results[0]["value"], 1)
        self.assertEqual(results[1]["value"], 1)
        self.assertEqual(results[2]["value"], 1)

    async def test_conflict_when_fingerprint_changes(self) -> None:
        coordinator = AsyncIdempotencyCoordinator(ttl_seconds=120, max_entries=100)

        async def operation() -> dict[str, str]:
            return {"ok": "yes"}

        await coordinator.execute(key="k2", fingerprint="f1", operation=operation)
        with self.assertRaises(IdempotencyConflictError):
            await coordinator.execute(key="k2", fingerprint="f2", operation=operation)

    async def test_failed_operation_is_not_cached(self) -> None:
        coordinator = AsyncIdempotencyCoordinator(ttl_seconds=120, max_entries=100)
        run_count = 0

        async def operation() -> dict[str, int]:
            nonlocal run_count
            run_count += 1
            if run_count == 1:
                raise RuntimeError("transient failure")
            return {"value": run_count}

        with self.assertRaises(RuntimeError):
            await coordinator.execute(key="k3", fingerprint="f1", operation=operation)

        second = await coordinator.execute(key="k3", fingerprint="f1", operation=operation)
        self.assertEqual(second["value"], 2)
        self.assertEqual(run_count, 2)


class IdempotencyKeyTests(unittest.TestCase):
    def test_normalization(self) -> None:
        self.assertEqual(normalize_idempotency_key("  request-12345 "), "request-12345")
        self.assertIsNone(normalize_idempotency_key(None))
        self.assertIsNone(normalize_idempotency_key(" "))

    def test_invalid_keys(self) -> None:
        with self.assertRaises(ValueError):
            normalize_idempotency_key("short")
        with self.assertRaises(ValueError):
            normalize_idempotency_key("invalid key with spaces")

    def test_fingerprint_is_deterministic(self) -> None:
        left = build_fingerprint({"a": 1, "b": 2})
        right = build_fingerprint({"b": 2, "a": 1})
        changed = build_fingerprint({"a": 1, "b": 3})
        self.assertEqual(left, right)
        self.assertNotEqual(left, changed)


if __name__ == "__main__":
    unittest.main()

