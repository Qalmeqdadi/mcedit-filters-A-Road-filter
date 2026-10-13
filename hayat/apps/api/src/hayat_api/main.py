from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from hayat_agents import SignalValidationError

from .config import get_settings
from .routers import events, health, pulse, signals
from .services import NotSeededError


def create_app() -> FastAPI:
    app = FastAPI(
        title="HAYAT | حياة API",
        description="Autonomous Resilience Intelligence. Phase 1: Global Pulse vertical slice.",
        version="0.1.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_settings().cors_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.exception_handler(NotSeededError)
    async def not_seeded(_: Request, exc: NotSeededError) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @app.exception_handler(SignalValidationError)
    async def invalid_signal(_: Request, exc: SignalValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    for router in (health.router, pulse.router, signals.router, events.router):
        app.include_router(router, prefix="/api")
    return app


app = create_app()
