from __future__ import annotations

import contextvars
import json
import logging
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import Request

correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("correlation_id", default="-")


def get_correlation_id() -> str:
    return correlation_id_ctx.get()


def set_correlation_id(value: str) -> None:
    correlation_id_ctx.set(value)


def generate_correlation_id() -> str:
    return uuid4().hex


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": get_correlation_id(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=True)


def configure_logging() -> None:
    root_logger = logging.getLogger()
    if root_logger.handlers:
        return

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(handler)


async def correlation_middleware(request: Request, call_next):
    incoming = request.headers.get("X-Correlation-ID", "").strip()
    correlation_id = incoming or generate_correlation_id()
    set_correlation_id(correlation_id)

    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response

