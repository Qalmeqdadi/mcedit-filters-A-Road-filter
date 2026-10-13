from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import services
from ..db import get_session

router = APIRouter(tags=["pulse"])


@router.get("/pulse")
def get_pulse(session: Session = Depends(get_session)) -> dict:
    """Current national resilience state plus the geographic reference network."""
    return services.pulse(session)
