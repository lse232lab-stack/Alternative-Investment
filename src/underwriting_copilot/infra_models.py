from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np
import pandas as pd

from .engine import irr, npv


ProductionScenario = Literal["P50", "P90"]


@dataclass(frozen=True)
class PPAContract:
    name: str
    contracted_volume_pct: float
    price_per_mwh: float
    price_escalator: float
    remaining_years: int
    offtaker: str
    credit_rating: str


@dataclass(frozen=True)
class InfraAssumptions:
    project_name: str = "Project Orion - Offshore Wind"
    location: str = "Texas, U.S."
    capacity_mw_ac: float = 250
    p50_mwh: float = 625_000
    p90_mwh: float = 562_500
    production_scenario: ProductionScenario = "P50"
    annual_degradation: float = 0.003
    merchant_volume_pct: float = 0.30
    merchant_price_per_mwh: float = 30.0
    merchant_price_escalator: float = 0.02
    opex_initial: float = 3_200_000
    opex_escalator: float = 0.02
    asset_management_fee: float = 250_000
    acquisition_price: float = 180_000_000
    ownership_pct: float = 1.00
    debt_pct: float = 0.55
    interest_rate: float = 0.055
    debt_tenor_years: int = 10
    holding_period_years: int = 10
    terminal_ebitda_multiple: float = 9.0
    discount_rate: float = 0.09

    def validate(self) -> None:
        if self.capacity_mw_ac <= 0:
            raise ValueError("capacity_mw_ac must be positive.")
        if self.acquisition_price <= 0:
            raise ValueError("acquisition_price must be positive.")
        if not 0 <= self.ownership_pct <= 1:
            raise ValueError("ownership_pct must be between 0 and 1.")
        if not 0 <= self.debt_pct <= 0.9:
            raise ValueError("debt_pct must be between 0 and 0.9.")
        if self.holding_period_years < 2:
            raise ValueError("holding_period_years must be at least 2.")


@dataclass(frozen=True)
class InfraResult:
    assumptions: InfraAssumptions
    ppa_contracts: list[PPAContract]
    project_cf: pd.DataFrame
    debt_schedule: pd.DataFrame
    returns: pd.DataFrame
    metrics: dict[str, float]
    equity_cash_flows: list[float]


def default_ppa_contracts() -> list[PPAContract]:
    return [
        PPAContract("PPA 1", 0.50, 25.0, 0.020, 20, "Chevron", "A+"),
        PPAContract("PPA 2", 0.20, 27.0, 0.022, 18, "AT&T", "A+"),
    ]


def underwrite_infra(
    assumptions: InfraAssumptions,
    ppa_contracts: list[PPAContract] | None = None,
) -> InfraResult:
    assumptions.validate()
    ppa_contracts = ppa_contracts or default_ppa_contracts()
    base_production = assumptions.p50_mwh if assumptions.production_scenario == "P50" else assumptions.p90_mwh
    contracted_pct = sum(contract.contracted_volume_pct for contract in ppa_contracts)

    debt_amount = assumptions.acquisition_price * assumptions.debt_pct
    equity_amount = assumptions.acquisition_price - debt_amount
    annual_principal = debt_amount / assumptions.debt_tenor_years if assumptions.debt_tenor_years else 0
    debt_balance = debt_amount

    cf_rows = []
    debt_rows = []
    return_rows = []
    equity_cash_flows = [-equity_amount]

    terminal_value = 0.0
    for year in range(1, assumptions.holding_period_years + 1):
        degradation_factor = (1 - assumptions.annual_degradation) ** (year - 1)
        production = base_production * degradation_factor

        ppa_revenue = 0.0
        for contract in ppa_contracts:
            contract_volume = production * contract.contracted_volume_pct if year <= contract.remaining_years else 0.0
            contract_price = contract.price_per_mwh * ((1 + contract.price_escalator) ** (year - 1))
            ppa_revenue += contract_volume * contract_price

        merchant_volume_pct = max(0.0, 1 - contracted_pct)
        merchant_volume = production * merchant_volume_pct
        merchant_price = assumptions.merchant_price_per_mwh * ((1 + assumptions.merchant_price_escalator) ** (year - 1))
        merchant_revenue = merchant_volume * merchant_price
        total_revenue = ppa_revenue + merchant_revenue
        opex = assumptions.opex_initial * ((1 + assumptions.opex_escalator) ** (year - 1))
        ebitda = total_revenue - opex - assumptions.asset_management_fee

        interest = debt_balance * assumptions.interest_rate
        principal = min(debt_balance, annual_principal) if year <= assumptions.debt_tenor_years else 0.0
        debt_service = interest + principal
        dscr = ebitda / debt_service if debt_service else float("inf")
        debt_balance -= principal

        sale_proceeds = 0.0
        if year == assumptions.holding_period_years:
            terminal_value = ebitda * assumptions.terminal_ebitda_multiple
            sale_proceeds = terminal_value - debt_balance
            debt_balance = 0.0

        equity_cf = (ebitda - debt_service + sale_proceeds) * assumptions.ownership_pct
        equity_cash_flows.append(equity_cf)

        cf_rows.append(
            {
                "Year": year,
                "Production MWh": production,
                "PPA Revenue": ppa_revenue,
                "Merchant Revenue": merchant_revenue,
                "Total Revenue": total_revenue,
                "Opex": opex,
                "Asset Management Fee": assumptions.asset_management_fee,
                "EBITDA": ebitda,
                "Contracted Revenue %": ppa_revenue / total_revenue if total_revenue else 0.0,
            }
        )
        debt_rows.append(
            {
                "Year": year,
                "Beginning Debt": debt_balance + principal,
                "Interest": interest,
                "Principal": principal,
                "Debt Service": debt_service,
                "Ending Debt": debt_balance,
                "DSCR": dscr,
            }
        )
        return_rows.append(
            {
                "Year": year,
                "Project EBITDA": ebitda,
                "Debt Service": debt_service,
                "Terminal / Sale Proceeds": sale_proceeds,
                "Equity Cash Flow": equity_cf,
            }
        )

    positive_cf = sum(cf for cf in equity_cash_flows[1:] if cf > 0)
    metrics = {
        "equity_amount": equity_amount,
        "debt_amount": debt_amount,
        "levered_irr": irr(equity_cash_flows),
        "equity_multiple": positive_cf / equity_amount if equity_amount else float("nan"),
        "min_dscr": min(row["DSCR"] for row in debt_rows),
        "average_dscr": float(np.mean([row["DSCR"] for row in debt_rows if np.isfinite(row["DSCR"])])),
        "year1_contracted_revenue_pct": cf_rows[0]["Contracted Revenue %"],
        "terminal_value": terminal_value,
        "npv": npv(assumptions.discount_rate, equity_cash_flows),
    }
    return InfraResult(
        assumptions=assumptions,
        ppa_contracts=ppa_contracts,
        project_cf=pd.DataFrame(cf_rows),
        debt_schedule=pd.DataFrame(debt_rows),
        returns=pd.DataFrame(return_rows),
        metrics=metrics,
        equity_cash_flows=equity_cash_flows,
    )


def infra_memo(result: InfraResult) -> str:
    a = result.assumptions
    m = result.metrics
    ppa_lines = "\n".join(
        [
            f"- {c.name}: {c.contracted_volume_pct:.1%} contracted, ${c.price_per_mwh:.1f}/MWh, {c.remaining_years} years remaining, offtaker {c.offtaker} ({c.credit_rating})"
            for c in result.ppa_contracts
        ]
    )
    dscr_comment = (
        "Minimum DSCR is below 1.00x, so the base case should be treated as a financing stress case unless debt sizing is reduced or tenor is extended."
        if m["min_dscr"] < 1.0
        else "Minimum DSCR remains above 1.00x in the base case, though P90 production and merchant-price downside should still be tested."
    )
    return f"""# Infrastructure Investment Memo Draft

## 1. Project Overview
{a.project_name} is modeled as a {a.capacity_mw_ac:.0f}MW AC offshore wind project located in {a.location}. The case uses {a.production_scenario} production of {a.p50_mwh if a.production_scenario == 'P50' else a.p90_mwh:,.0f}MWh and annual degradation of {a.annual_degradation:.1%}.

## 2. Contracted Revenue
{ppa_lines}

## 3. Key Metrics
- Levered IRR: {m['levered_irr']:.1%}
- Equity Multiple: {m['equity_multiple']:.2f}x
- Minimum DSCR: {m['min_dscr']:.2f}x
- Year 1 Contracted Revenue: {m['year1_contracted_revenue_pct']:.1%}
- Terminal Value: ${m['terminal_value'] / 1_000_000:,.1f}mn

## 4. Main Diligence Focus
- {dscr_comment}
- Verify PPA tenor, contracted volume, pricing escalators, and offtaker credit quality.
- Test downside production under P90 and merchant price stress.
- Review O&M agreement, availability guarantees, curtailment exposure, and interconnection risk.
- Assess whether debt sizing is robust under minimum DSCR and downside cases.
"""
