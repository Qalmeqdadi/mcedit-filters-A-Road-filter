from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SignalIn(BaseModel):
    """An external event reporting a possible disruption."""

    kind: Literal["maritime_disruption"]
    title: str = Field(min_length=3, max_length=300)
    source: str = Field(min_length=1, max_length=120)
    severity: Literal["minor", "moderate", "major", "severe"] = "major"
    chokepoint: str = Field(min_length=2, max_length=40, examples=["BAB_EL_MANDEB"])
    delay_days: float = Field(gt=0, le=120)
    observed_at: datetime | None = None
