from __future__ import annotations

from dataclasses import replace
from typing import Iterable

import numpy as np
import pandas as pd

from .models import DealAssumptions, UnderwritingResult


def irr(cash_flows: Iterable[float], guess: float = 0.1) -> float:
    """Newton-Raphson IRR implementation to avoid an extra dependency."""
    flows = list(cash_flows)
    rate = guess
    for _ in range(100):
        npv = sum(cf / ((1 + rate) ** i) for i, cf in enumerate(flows))
        derivative = sum(-i * cf / ((1 + rate) ** (i + 1)) for i, cf in enumerate(flows) if i)
        if abs(derivative) < 1e-9:
            break
        next_rate = rate - npv / derivative
        if next_rate <= -0.9999 or not np.isfinite(next_rate):
            break
        if abs(next_rate - rate) < 1e-8:
            return next_rate
        rate = next_rate
    return float("nan")


def npv(discount_rate: float, cash_flows: Iterable[float]) -> float:
    return sum(cf / ((1 + discount_rate) ** i) for i, cf in enumerate(cash_flows))


def underwrite(assumptions: DealAssumptions) -> UnderwritingResult:
    assumptions.validate()

    years = list(range(1, assumptions.holding_period_years + 1))
    loan_amount = assumptions.purchase_price * assumptions.ltv
    acquisition_costs = assumptions.purchase_price * assumptions.acquisition_cost_rate
    loan_fees = loan_amount * assumptions.loan_fee_rate
    total_uses = assumptions.purchase_price + acquisition_costs + loan_fees
    initial_equity = total_uses - loan_amount

    operating_rows = []
    debt_rows = []
    returns_rows = []

    beginning_debt = loan_amount
    equity_cash_flows = [-initial_equity]
    unlevered_cash_flows = [-total_uses]
    annual_equity_distributions = []

    next_year_noi = 0.0
    exit_value = 0.0
    net_sale_proceeds = 0.0

    for year in years:
        growth_factor = (1 + assumptions.rent_growth) ** (year - 1)
        potential_gross_income = assumptions.leasable_area_sqm * assumptions.annual_rent_per_sqm * growth_factor
        vacancy_factor = max(assumptions.vacancy_rate, 1 - assumptions.occupancy_rate)
        vacancy_loss = potential_gross_income * vacancy_factor
        effective_gross_income = potential_gross_income - vacancy_loss
        operating_expense = assumptions.leasable_area_sqm * assumptions.annual_opex_per_sqm * growth_factor
        capex = assumptions.leasable_area_sqm * assumptions.capex_per_sqm
        asset_management_fee = assumptions.purchase_price * assumptions.asset_management_fee_rate
        noi = effective_gross_income - operating_expense
        cash_flow_before_debt = noi - capex - asset_management_fee

        interest = beginning_debt * assumptions.interest_rate
        if assumptions.repayment_type == "amortizing":
            principal = min(beginning_debt, loan_amount * assumptions.amortization_rate)
        else:
            principal = 0.0
        ending_debt = beginning_debt - principal
        debt_service = interest + principal
        dscr = noi / debt_service if debt_service else float("inf")
        icr = noi / interest if interest else float("inf")
        debt_yield = noi / beginning_debt if beginning_debt else float("inf")

        sale_proceeds = 0.0
        if year == assumptions.holding_period_years:
            next_year_growth = (1 + assumptions.rent_growth) ** year
            next_year_pgi = assumptions.leasable_area_sqm * assumptions.annual_rent_per_sqm * next_year_growth
            next_year_vacancy = next_year_pgi * vacancy_factor
            next_year_egi = next_year_pgi - next_year_vacancy
            next_year_opex = assumptions.leasable_area_sqm * assumptions.annual_opex_per_sqm * next_year_growth
            next_year_noi = next_year_egi - next_year_opex
            exit_value = next_year_noi / assumptions.exit_cap_rate
            selling_costs = exit_value * assumptions.selling_cost_rate
            net_sale_proceeds = exit_value - selling_costs - ending_debt
            sale_proceeds = net_sale_proceeds
            ending_debt = 0.0

        equity_cf = cash_flow_before_debt - debt_service + sale_proceeds
        unlevered_cf = cash_flow_before_debt
        if year == assumptions.holding_period_years:
            unlevered_cf += exit_value * (1 - assumptions.selling_cost_rate)

        equity_cash_flows.append(equity_cf)
        unlevered_cash_flows.append(unlevered_cf)
        annual_equity_distributions.append(cash_flow_before_debt - debt_service)

        operating_rows.append(
            {
                "Year": year,
                "Potential Gross Income": potential_gross_income,
                "Effective Gross Income": effective_gross_income,
                "Vacancy Loss": vacancy_loss,
                "Operating Expense": operating_expense,
                "NOI": noi,
                "CAPEX": capex,
                "Asset Management Fee": asset_management_fee,
                "Cash Flow Before Debt": cash_flow_before_debt,
            }
        )
        debt_rows.append(
            {
                "Year": year,
                "Beginning Debt": beginning_debt,
                "Interest": interest,
                "Principal": principal,
                "Debt Service": debt_service,
                "Ending Debt": ending_debt,
                "DSCR": dscr,
                "ICR": icr,
                "Debt Yield": debt_yield,
            }
        )
        returns_rows.append(
            {
                "Year": year,
                "Equity Distribution": cash_flow_before_debt - debt_service,
                "Net Sale Proceeds": sale_proceeds,
                "Equity Cash Flow": equity_cf,
                "Unlevered Cash Flow": unlevered_cf,
            }
        )
        beginning_debt = ending_debt

    levered_irr = irr(equity_cash_flows)
    unlevered_irr = irr(unlevered_cash_flows)
    positive_equity_cf = sum(cf for cf in equity_cash_flows[1:] if cf > 0)
    equity_multiple = positive_equity_cf / initial_equity if initial_equity else float("nan")
    average_coc = float(np.mean([cf / initial_equity for cf in annual_equity_distributions])) if initial_equity else float("nan")
    min_dscr = min(row["DSCR"] for row in debt_rows)
    stabilized_noi = operating_rows[0]["NOI"]
    entry_cap_rate = stabilized_noi / assumptions.purchase_price
    sale_profit_share = net_sale_proceeds / positive_equity_cf if positive_equity_cf else float("nan")

    sources_uses = pd.DataFrame(
        [
            {"Category": "Uses", "Item": "Purchase Price", "Amount": assumptions.purchase_price},
            {"Category": "Uses", "Item": "Acquisition Costs", "Amount": acquisition_costs},
            {"Category": "Uses", "Item": "Loan Fees", "Amount": loan_fees},
            {"Category": "Sources", "Item": "Senior Loan", "Amount": loan_amount},
            {"Category": "Sources", "Item": "Sponsor Equity", "Amount": initial_equity},
        ]
    )
    metrics = {
        "purchase_price": assumptions.purchase_price,
        "loan_amount": loan_amount,
        "initial_equity": initial_equity,
        "entry_cap_rate": entry_cap_rate,
        "exit_value": exit_value,
        "next_year_noi": next_year_noi,
        "levered_irr": levered_irr,
        "unlevered_irr": unlevered_irr,
        "equity_multiple": equity_multiple,
        "average_cash_on_cash": average_coc,
        "min_dscr": min_dscr,
        "year1_debt_yield": debt_rows[0]["Debt Yield"],
        "npv": npv(assumptions.discount_rate, equity_cash_flows),
        "sale_profit_share": sale_profit_share,
        "sources_uses_check": total_uses - (loan_amount + initial_equity),
    }
    return UnderwritingResult(
        assumptions=assumptions,
        sources_uses=sources_uses,
        operating_cf=pd.DataFrame(operating_rows),
        debt_schedule=pd.DataFrame(debt_rows),
        returns=pd.DataFrame(returns_rows),
        metrics=metrics,
        equity_cash_flows=equity_cash_flows,
        unlevered_cash_flows=unlevered_cash_flows,
    )


def with_purchase_price(assumptions: DealAssumptions, purchase_price: float) -> DealAssumptions:
    return replace(assumptions, purchase_price=purchase_price)
