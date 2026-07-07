from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pandas as pd


RepaymentType = Literal["interest_only", "amortizing"]


@dataclass(frozen=True)
class DealAssumptions:
    deal_name: str = "Yeouido Office Acquisition"
    analysis_date: str = "2026-07-06"
    purchase_price: float = 100_000_000_000
    leasable_area_sqm: float = 30_000
    occupancy_rate: float = 0.92
    annual_rent_per_sqm: float = 280_000
    annual_opex_per_sqm: float = 70_000
    rent_growth: float = 0.02
    vacancy_rate: float = 0.08
    capex_per_sqm: float = 12_000
    asset_management_fee_rate: float = 0.003
    acquisition_cost_rate: float = 0.046
    ltv: float = 0.60
    interest_rate: float = 0.045
    amortization_rate: float = 0.00
    repayment_type: RepaymentType = "interest_only"
    loan_fee_rate: float = 0.010
    holding_period_years: int = 5
    exit_cap_rate: float = 0.048
    selling_cost_rate: float = 0.010
    discount_rate: float = 0.085

    def validate(self) -> None:
        if self.purchase_price <= 0:
            raise ValueError("purchase_price must be positive.")
        if self.leasable_area_sqm <= 0:
            raise ValueError("leasable_area_sqm must be positive.")
        if not 0 <= self.occupancy_rate <= 1:
            raise ValueError("occupancy_rate must be between 0 and 1.")
        if not 0 <= self.vacancy_rate <= 1:
            raise ValueError("vacancy_rate must be between 0 and 1.")
        if not 0 <= self.ltv <= 0.9:
            raise ValueError("ltv must be between 0 and 0.9 for this MVP.")
        if self.interest_rate < 0:
            raise ValueError("interest_rate cannot be negative.")
        if self.exit_cap_rate <= 0:
            raise ValueError("exit_cap_rate must be positive.")
        if self.holding_period_years < 2:
            raise ValueError("holding_period_years must be at least 2.")


@dataclass(frozen=True)
class UnderwritingResult:
    assumptions: DealAssumptions
    sources_uses: pd.DataFrame
    operating_cf: pd.DataFrame
    debt_schedule: pd.DataFrame
    returns: pd.DataFrame
    metrics: dict[str, float]
    equity_cash_flows: list[float]
    unlevered_cash_flows: list[float]
