from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from tahminx_api.core.logging import get_correlation_id


class ProblemDetails(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str
    instance: str
    correlation_id: str


class DomainValidationError(ValueError):
    pass


def _problem_response(*, status: int, title: str, detail: str, instance: str) -> JSONResponse:
    payload = ProblemDetails(
        title=title,
        status=status,
        detail=detail,
        instance=instance,
        correlation_id=get_correlation_id(),
    ).model_dump()
    return JSONResponse(status_code=status, content=payload, media_type="application/problem+json")


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def handle_request_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        detail = "; ".join(
            f"{'.'.join(str(part) for part in err.get('loc', []))}: {err.get('msg', 'invalid value')}"
            for err in exc.errors()
        )
        return _problem_response(
            status=422,
            title="Request Validation Error",
            detail=detail or "Invalid request payload.",
            instance=str(_.url.path),
        )

    @app.exception_handler(DomainValidationError)
    async def handle_domain_validation(request: Request, exc: DomainValidationError) -> JSONResponse:
        return _problem_response(
            status=400,
            title="Domain Validation Error",
            detail=str(exc),
            instance=str(request.url.path),
        )

    @app.exception_handler(HTTPException)
    async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        detail = str(exc.detail) if exc.detail else "Request failed."
        title = "HTTP Error"
        if exc.status_code == 404:
            title = "Resource Not Found"
        if exc.status_code == 409:
            title = "Conflict"
        return _problem_response(
            status=exc.status_code,
            title=title,
            detail=detail,
            instance=str(request.url.path),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, _: Exception) -> JSONResponse:
        return _problem_response(
            status=500,
            title="Internal Server Error",
            detail="Unexpected server error.",
            instance=str(request.url.path),
        )

