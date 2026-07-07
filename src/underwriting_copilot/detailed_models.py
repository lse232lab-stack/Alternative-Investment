from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .engine import irr, npv


@dataclass(frozen=True)
class DetailedModelResult:
    asset_class: str
    case_name: str
    cash_flow: pd.DataFrame
    debt_schedule: pd.DataFrame
    metrics: dict[str, float]
    equity_cash_flows: list[float]
    memo: str


@dataclass(frozen=True)
class LogisticsAssumptions:
    case_name: str = "Prologis-style logistics portfolio case"
    acquisition_price: float = 250_000_000
    net_leasable_area_sqm: float = 120_000
    occupancy_rate: float = 0.96
    rent_per_sqm_year: float = 145
    market_rent_growth: float = 0.035
    renewal_spread: float = 0.08
    opex_ratio: float = 0.25
    capex_per_sqm_year: float = 4.0
    downtime_vacancy: float = 0.02
    ltv: float = 0.50
    interest_rate: float = 0.055
    amortization_rate: float = 0.015
    exit_cap_rate: float = 0.055
    selling_cost_rate: float = 0.01
    holding_period_years: int = 5
    discount_rate: float = 0.09


@dataclass(frozen=True)
class DataCenterAssumptions:
    case_name: str = "Equinix/Digital Realty-style data center case"
    acquisition_price: float = 600_000_000
    critical_it_mw: float = 36.0
    stabilized_utilization: float = 0.82
    rent_per_kw_month: float = 185.0
    utilization_growth: float = 0.025
    rent_escalation: float = 0.03
    power_cost_pct_revenue: float = 0.24
    facility_opex_pct_revenue: float = 0.22
    maintenance_capex_pct_revenue: float = 0.08
    expansion_capex_year1: float = 8_000_000
    expansion_capex_decline: float = 0.15
    ltv: float = 0.45
    interest_rate: float = 0.058
    amortization_rate: float = 0.01
    exit_ebitda_multiple: float = 14.0
    holding_period_years: int = 5
    discount_rate: float = 0.095


@dataclass(frozen=True)
class PrivateCreditAssumptions:
    case_name: str = "Public BDC portfolio case"
    portfolio_principal: float = 100_000_000
    coupon_rate: float = 0.105
    upfront_fee_rate: float = 0.015
    annual_default_rate: float = 0.018
    recovery_rate: float = 0.60
    annual_prepayment_rate: float = 0.08
    reinvestment_rate: float = 0.60
    management_fee_rate: float = 0.010
    loss_reserve_pct: float = 0.005
    holding_period_years: int = 5
    discount_rate: float = 0.09


@dataclass(frozen=True)
class LBOAssumptions:
    case_name: str = "Public company LBO teaching case"
    entry_ebitda: float = 60_000_000
    entry_multiple: float = 9.0
    debt_multiple: float = 4.5
    revenue_growth: float = 0.055
    ebitda_margin_expansion: float = 0.005
    cash_tax_rate: float = 0.24
    capex_pct_ebitda: float = 0.22
    nwc_pct_ebitda_growth: float = 0.10
    interest_rate: float = 0.075
    cash_sweep_pct: float = 0.75
    exit_multiple: float = 9.0
    holding_period_years: int = 5
    discount_rate: float = 0.12


def _common_metrics(discount_rate: float, cfs: list[float]) -> dict[str, float]:
    invested = -cfs[0]
    positive = sum(cf for cf in cfs[1:] if cf > 0)
    return {
        "equity_invested": invested,
        "levered_irr": irr(cfs),
        "equity_multiple": positive / invested if invested else float("nan"),
        "npv": npv(discount_rate, cfs),
    }


def underwrite_logistics(a: LogisticsAssumptions) -> DetailedModelResult:
    debt = a.acquisition_price * a.ltv
    equity = a.acquisition_price - debt
    balance = debt
    rows = []
    debt_rows = []
    cfs = [-equity]
    for year in range(1, a.holding_period_years + 1):
        rent_growth = (1 + a.market_rent_growth) ** (year - 1)
        mark_to_market = 1 + (a.renewal_spread * min(year - 1, 3) / 3)
        gross_rent = a.net_leasable_area_sqm * a.rent_per_sqm_year * rent_growth * mark_to_market
        economic_vacancy = gross_rent * max(1 - a.occupancy_rate, a.downtime_vacancy)
        effective_rent = gross_rent - economic_vacancy
        opex = effective_rent * a.opex_ratio
        noi = effective_rent - opex
        capex = a.net_leasable_area_sqm * a.capex_per_sqm_year
        interest = balance * a.interest_rate
        principal = min(balance, debt * a.amortization_rate)
        debt_service = interest + principal
        balance -= principal
        dscr = noi / debt_service if debt_service else float("inf")
        terminal = 0.0
        if year == a.holding_period_years:
            next_noi = noi * (1 + a.market_rent_growth)
            terminal = next_noi / a.exit_cap_rate * (1 - a.selling_cost_rate) - balance
            balance = 0.0
        equity_cf = noi - capex - debt_service + terminal
        rows.append(
            {
                "Year": year,
                "Gross Rent": gross_rent,
                "Economic Vacancy": economic_vacancy,
                "Effective Rent": effective_rent,
                "Opex": opex,
                "NOI": noi,
                "CAPEX": capex,
                "Terminal Proceeds": terminal,
                "Equity Cash Flow": equity_cf,
            }
        )
        debt_rows.append(
            {
                "Year": year,
                "Beginning Debt": balance + principal,
                "Interest": interest,
                "Principal": principal,
                "Debt Service": debt_service,
                "Ending Debt": balance,
                "DSCR": dscr,
            }
        )
        cfs.append(equity_cf)
    metrics = _common_metrics(a.discount_rate, cfs)
    metrics.update(
        {
            "year1_noi": rows[0]["NOI"],
            "entry_cap_rate": rows[0]["NOI"] / a.acquisition_price,
            "min_dscr": min(row["DSCR"] for row in debt_rows),
            "exit_value": rows[-1]["Terminal Proceeds"],
        }
    )
    memo = f"""# Logistics Underwriting Memo Draft

## Core Thesis
The logistics case tests whether rent growth, occupancy, renewal spread, and exit cap assumptions support a warehouse acquisition.

## Key Metrics
- Levered IRR: {metrics['levered_irr']:.1%}
- Equity Multiple: {metrics['equity_multiple']:.2f}x
- Entry Cap Rate: {metrics['entry_cap_rate']:.1%}
- Min DSCR: {metrics['min_dscr']:.2f}x

## Diligence Focus
- Verify tenant concentration, lease maturity, renewal spread, and market rent evidence.
- Check new supply, transport access, replacement cost, and downtime assumptions.
- Stress exit cap widening and rent growth slowdown.
"""
    return DetailedModelResult("Logistics", a.case_name, pd.DataFrame(rows), pd.DataFrame(debt_rows), metrics, cfs, memo)


def underwrite_data_center(a: DataCenterAssumptions) -> DetailedModelResult:
    debt = a.acquisition_price * a.ltv
    equity = a.acquisition_price - debt
    balance = debt
    rows = []
    debt_rows = []
    cfs = [-equity]
    for year in range(1, a.holding_period_years + 1):
        utilization = min(0.98, a.stabilized_utilization + a.utilization_growth * (year - 1))
        rent = a.rent_per_kw_month * ((1 + a.rent_escalation) ** (year - 1))
        revenue = a.critical_it_mw * 1000 * utilization * rent * 12
        power_cost = revenue * a.power_cost_pct_revenue
        facility_opex = revenue * a.facility_opex_pct_revenue
        ebitda = revenue - power_cost - facility_opex
        maintenance_capex = revenue * a.maintenance_capex_pct_revenue
        expansion_capex = a.expansion_capex_year1 * ((1 - a.expansion_capex_decline) ** (year - 1))
        interest = balance * a.interest_rate
        principal = min(balance, debt * a.amortization_rate)
        debt_service = interest + principal
        balance -= principal
        dscr = ebitda / debt_service if debt_service else float("inf")
        terminal = 0.0
        if year == a.holding_period_years:
            terminal = ebitda * a.exit_ebitda_multiple - balance
            balance = 0.0
        equity_cf = ebitda - maintenance_capex - expansion_capex - debt_service + terminal
        rows.append(
            {
                "Year": year,
                "Utilization": utilization,
                "Revenue": revenue,
                "Power Cost": power_cost,
                "Facility Opex": facility_opex,
                "EBITDA": ebitda,
                "Maintenance CAPEX": maintenance_capex,
                "Expansion CAPEX": expansion_capex,
                "Terminal Proceeds": terminal,
                "Equity Cash Flow": equity_cf,
            }
        )
        debt_rows.append(
            {
                "Year": year,
                "Beginning Debt": balance + principal,
                "Interest": interest,
                "Principal": principal,
                "Debt Service": debt_service,
                "Ending Debt": balance,
                "DSCR": dscr,
            }
        )
        cfs.append(equity_cf)
    metrics = _common_metrics(a.discount_rate, cfs)
    metrics.update(
        {
            "year1_revenue": rows[0]["Revenue"],
            "year1_ebitda_margin": rows[0]["EBITDA"] / rows[0]["Revenue"],
            "min_dscr": min(row["DSCR"] for row in debt_rows),
            "exit_enterprise_value": rows[-1]["EBITDA"] * a.exit_ebitda_multiple,
        }
    )
    memo = f"""# Data Center Underwriting Memo Draft

## Core Thesis
The data center case links MW capacity, utilization, power cost, operating margin, and capex to equity returns.

## Key Metrics
- Levered IRR: {metrics['levered_irr']:.1%}
- Equity Multiple: {metrics['equity_multiple']:.2f}x
- Year 1 EBITDA Margin: {metrics['year1_ebitda_margin']:.1%}
- Min DSCR: {metrics['min_dscr']:.2f}x

## Diligence Focus
- Verify contracted load, customer mix, renewal terms, power procurement, and PUE/cooling assumptions.
- Separate maintenance capex from expansion capex.
- Stress power price, utilization, and exit multiple.
"""
    return DetailedModelResult("Data Center", a.case_name, pd.DataFrame(rows), pd.DataFrame(debt_rows), metrics, cfs, memo)


def underwrite_private_credit(a: PrivateCreditAssumptions) -> DetailedModelResult:
    rows = []
    cfs = [-a.portfolio_principal]
    performing = a.portfolio_principal
    for year in range(1, a.holding_period_years + 1):
        beginning = performing
        defaults = beginning * a.annual_default_rate
        recovery = defaults * a.recovery_rate
        credit_loss = defaults - recovery
        prepayment = (beginning - defaults) * a.annual_prepayment_rate
        reinvestment = prepayment * a.reinvestment_rate
        ending = beginning - defaults - prepayment + reinvestment
        coupon_income = beginning * a.coupon_rate
        upfront_fee_income = beginning * a.upfront_fee_rate / a.holding_period_years
        management_fee = beginning * a.management_fee_rate
        loss_reserve = beginning * a.loss_reserve_pct
        terminal = ending if year == a.holding_period_years else 0.0
        cf = coupon_income + upfront_fee_income + recovery - management_fee - loss_reserve + terminal
        rows.append(
            {
                "Year": year,
                "Beginning Performing Principal": beginning,
                "Coupon Income": coupon_income,
                "Upfront Fee Income": upfront_fee_income,
                "Defaults": defaults,
                "Recovery": recovery,
                "Credit Loss": credit_loss,
                "Prepayment": prepayment,
                "Reinvestment": reinvestment,
                "Ending Performing Principal": 0 if year == a.holding_period_years else ending,
                "Equity Cash Flow": cf,
            }
        )
        performing = ending
        cfs.append(cf)
    metrics = _common_metrics(a.discount_rate, cfs)
    metrics.update(
        {
            "gross_coupon": a.coupon_rate,
            "expected_loss_rate": a.annual_default_rate * (1 - a.recovery_rate),
            "net_coupon_after_expected_loss": a.coupon_rate - a.annual_default_rate * (1 - a.recovery_rate),
            "ending_performing_principal_before_exit": rows[-1]["Beginning Performing Principal"],
        }
    )
    memo = f"""# Private Credit Underwriting Memo Draft

## Core Thesis
The private credit case tests whether coupon and fee income compensate for expected credit losses, prepayment, and illiquidity.

## Key Metrics
- Levered IRR: {metrics['levered_irr']:.1%}
- Equity Multiple: {metrics['equity_multiple']:.2f}x
- Expected Loss Rate: {metrics['expected_loss_rate']:.1%}
- Net Coupon After Expected Loss: {metrics['net_coupon_after_expected_loss']:.1%}

## Diligence Focus
- Verify borrower EBITDA, leverage, seniority, covenant package, sponsor support, and industry concentration.
- Stress default, recovery, and prepayment assumptions.
- Track non-accruals and amendments separately from performing coupon income.
"""
    return DetailedModelResult("Private Credit / Direct Lending", a.case_name, pd.DataFrame(rows), pd.DataFrame(), metrics, cfs, memo)


def underwrite_lbo(a: LBOAssumptions) -> DetailedModelResult:
    entry_ev = a.entry_ebitda * a.entry_multiple
    debt = a.entry_ebitda * a.debt_multiple
    equity = entry_ev - debt
    ebitda = a.entry_ebitda
    debt_balance = debt
    rows = []
    debt_rows = []
    cfs = [-equity]
    for year in range(1, a.holding_period_years + 1):
        next_ebitda = ebitda * (1 + a.revenue_growth) * (1 + a.ebitda_margin_expansion)
        ebitda_growth = next_ebitda - ebitda
        ebitda = next_ebitda
        taxes = max(0.0, ebitda - debt_balance * a.interest_rate) * a.cash_tax_rate
        capex = ebitda * a.capex_pct_ebitda
        nwc_investment = max(0.0, ebitda_growth) * a.nwc_pct_ebitda_growth
        interest = debt_balance * a.interest_rate
        pre_debt_fcf = ebitda - taxes - capex - nwc_investment - interest
        principal = min(debt_balance, max(0.0, pre_debt_fcf * a.cash_sweep_pct))
        debt_balance -= principal
        exit_equity_value = 0.0
        if year == a.holding_period_years:
            exit_ev = ebitda * a.exit_multiple
            exit_equity_value = exit_ev - debt_balance
            debt_balance = 0.0
        equity_cf = exit_equity_value
        rows.append(
            {
                "Year": year,
                "EBITDA": ebitda,
                "Cash Taxes": taxes,
                "CAPEX": capex,
                "NWC Investment": nwc_investment,
                "Interest": interest,
                "Debt Paydown": principal,
                "Exit Equity Value": exit_equity_value,
                "Equity Cash Flow": equity_cf,
            }
        )
        debt_rows.append(
            {
                "Year": year,
                "Beginning Debt": debt_balance + principal,
                "Interest": interest,
                "Debt Paydown": principal,
                "Ending Debt": debt_balance,
                "Net Debt / EBITDA": debt_balance / ebitda if ebitda else float("nan"),
            }
        )
        cfs.append(equity_cf)
    metrics = _common_metrics(a.discount_rate, cfs)
    metrics.update(
        {
            "entry_enterprise_value": entry_ev,
            "entry_equity": equity,
            "debt_paydown": debt,
            "exit_equity_value": rows[-1]["Exit Equity Value"],
            "ending_net_debt_to_ebitda": debt_rows[-1]["Net Debt / EBITDA"],
        }
    )
    memo = f"""# Private Equity LBO Memo Draft

## Core Thesis
The LBO case tests whether EBITDA growth, leverage, cash sweep, and exit multiple support target equity returns.

## Key Metrics
- Sponsor IRR: {metrics['levered_irr']:.1%}
- Equity Multiple: {metrics['equity_multiple']:.2f}x
- Entry EV: {metrics['entry_enterprise_value']:,.0f}
- Exit Equity Value: {metrics['exit_equity_value']:,.0f}

## Diligence Focus
- Verify quality of earnings, capex, working capital, debt capacity, and covenant headroom.
- Stress exit multiple contraction and slower EBITDA growth.
- Separate value creation from multiple expansion and leverage.
"""
    return DetailedModelResult("Private Equity Buyout", a.case_name, pd.DataFrame(rows), pd.DataFrame(debt_rows), metrics, cfs, memo)


def detailed_asset_classes() -> set[str]:
    return {"Logistics", "Data Center", "Private Credit / Direct Lending", "Private Equity Buyout"}
