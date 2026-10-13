from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from .. import services
from ..db import get_session
from ..schemas import SignalIn

router = APIRouter(tags=["signals"])


def _ingest(session: Session, raw_event: dict) -> dict:
    services.run_pipeline(session, raw_event=raw_event, trigger="signal")
    return services.pulse(session)


@router.post("/signals", status_code=status.HTTP_201_CREATED)
def ingest_signal(body: SignalIn, session: Session = Depends(get_session)) -> dict:
    """Ingest an external event and run the resilience pipeline on it."""
    raw = body.model_dump(mode="json", exclude_none=True)
    return _ingest(session, raw)


@router.post("/demo/disruption", status_code=status.HTTP_201_CREATED)
def trigger_demo_disruption(session: Session = Depends(get_session)) -> dict:
    """Ingest the demo event: Bab el-Mandeb closure, ~11-day rerouting delay."""
    return _ingest(session, dict(services.DEMO_EVENT))


@router.post("/demo/reset")
def reset_demo(session: Session = Depends(get_session)) -> dict:
    """Resolve all active signals and recalculate the baseline."""
    services.reset_signals(session)
    return services.pulse(session)
