"""Calculation parameters. Every threshold used by the engine lives here."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RiskBands:
    """Upper bounds (exclusive) of each shortage-risk band.

    With the risk formula in ``metrics.shortage_risk`` these bands mean:
      LOW       cover >= 1.4x the safety target
      ELEVATED  cover between the safety target and 1.4x target
      HIGH      cover below the safety target
      CRITICAL  cover below half the safety target, or any projected shortfall
    """

    low: float = 0.30
    elevated: float = 0.50
    high: float = 0.75


@dataclass(frozen=True)
class SimulationConfig:
    horizon_days: int = 30
    risk_bands: RiskBands = RiskBands()
    # Commodity resilience score = 100 * (buffer_weight * (1 - risk)
    #                                     + continuity_weight * supply_continuity)
    buffer_weight: float = 0.75
    continuity_weight: float = 0.25
    material_levels: tuple[str, ...] = ("HIGH", "CRITICAL")


DEFAULT_CONFIG = SimulationConfig()
