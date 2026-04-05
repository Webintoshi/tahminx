from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def healthcheck(request: Request) -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": request.app.title,
        "version": request.app.version,
        "time": datetime.now(timezone.utc).isoformat(),
    }

