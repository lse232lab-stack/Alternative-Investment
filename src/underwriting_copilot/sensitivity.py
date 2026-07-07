from __future__ import annotations

from dataclasses import replace

import pandas as pd

from .engine import underwrite
from .models import DealAssumptions


def exit_cap_rent_growth_table(
    assumptions: DealAssumptions,
    exit_cap_rates: list[float] | None = None,
    rent_growth_rates: list[float] | None = None,
) -> pd.DataFrame:
    exit_cap_rates = exit_cap_rates or [0.044, 0.046, 0.048, 0.050, 0.052]
    rent_growth_rates = rent_growth_rates or [0.00, 0.01, 0.02, 0.03, 0.04]

    rows = []
    for growth in rent_growth_rates:
        row = {"Rent Growth": growth}
        for exit_cap in exit_cap_rates:
            scenario = replace(assumptions, rent_growth=growth, exit_cap_rate=exit_cap)
            row[f"Exit Cap {exit_cap:.1%}"] = underwrite(scenario).metrics["levered_irr"]
        rows.append(row)
    return pd.DataFrame(rows)


def max_purchase_price_for_target_irr(
    assumptions: DealAssumptions,
    target_irr: float,
    low: float | None = None,
    high: float | None = None,
    tolerance: float = 1_000_000,
) -> float:
    low = low or assumptions.purchase_price * 0.50
    high = high or assumptions.purchase_price * 1.50

    for _ in range(80):
        mid = (low + high) / 2
        scenario = replace(assumptions, purchase_price=mid)
        irr = underwrite(scenario).metrics["levered_irr"]
        if irr >= target_irr:
            low = mid
        else:
            high = mid
        if high - low <= tolerance:
            break
    return low

