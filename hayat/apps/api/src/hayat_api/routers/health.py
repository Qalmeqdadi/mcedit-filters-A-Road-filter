from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from .. import repository
from ..db import get_session

router = APIRouter(tags=["health"])


@router.get("/health")
def health(session: Session = Depends(get_session)) -> dict:
    session.execute(text("SELECT 1"))
    return {
        "status": "ok",
        "database": session.get_bind().dialect.name,
        "seeded": repository.is_seeded(session),
    }
