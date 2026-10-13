from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Header, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import services
from ..config import get_settings
from ..db import get_session, new_session

router = APIRouter(tags=["events"])

HEARTBEAT_SECONDS = 15.0


@router.get("/events")
def list_events(
    after_id: int | None = Query(default=None, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    session: Session = Depends(get_session),
) -> list[dict]:
    """Audit log. Without ``after_id`` returns the most recent ``limit`` events."""
    if after_id is None:
        return services.recent_events(session, limit)
    return services.events_after(session, after_id, limit)


def _fetch_after(after_id: int) -> list[dict]:
    with new_session() as session:
        return services.events_after(session, after_id)


def _current_max() -> int:
    with new_session() as session:
        return services.max_event_id(session)


@router.get("/events/stream")
async def stream_events(
    request: Request,
    after_id: int | None = Query(default=None, ge=0),
    last_event_id: str | None = Header(default=None),
    max_seconds: float | None = Query(default=None, gt=0, include_in_schema=False),
) -> StreamingResponse:
    """Server-Sent Events: pushes each new audit event as it is written.

    Polls the database, so it works across API processes.
    """
    if after_id is None and last_event_id and last_event_id.isdigit():
        after_id = int(last_event_id)
    start = after_id if after_id is not None else await asyncio.to_thread(_current_max)
    poll = get_settings().stream_poll_seconds

    async def generate() -> AsyncIterator[str]:
        cursor = start
        started = last_beat = time.monotonic()
        yield "retry: 2000\n\n"
        while True:
            if await request.is_disconnected():
                return
            for event in await asyncio.to_thread(_fetch_after, cursor):
                cursor = event["id"]
                yield f"id: {cursor}\nevent: audit\ndata: {json.dumps(event)}\n\n"
            now = time.monotonic()
            if max_seconds is not None and now - started >= max_seconds:
                return
            if now - last_beat >= HEARTBEAT_SECONDS:
                last_beat = now
                yield ": heartbeat\n\n"
            await asyncio.sleep(poll)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
