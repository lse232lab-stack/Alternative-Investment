from __future__ import annotations

from .models import UnderwritingResult


def scan_risks(result: UnderwritingResult) -> list[dict[str, str]]:
    a = result.assumptions
    m = result.metrics
    risks: list[dict[str, str]] = []

    def add(level: str, title: str, detail: str) -> None:
        risks.append({"level": level, "title": title, "detail": detail})

    if m["min_dscr"] < 1.20:
        add("High", "DSCR covenant pressure", f"Minimum DSCR is {m['min_dscr']:.2f}x, below the 1.20x reference threshold.")
    if a.ltv > 0.65:
        add("High", "High leverage", f"LTV is {a.ltv:.1%}, which leaves limited cushion against value decline.")
    if a.vacancy_rate < 0.03:
        add("Medium", "Low vacancy assumption", f"Vacancy rate is only {a.vacancy_rate:.1%}; confirm this against market leasing evidence.")
    if a.rent_growth > 0.035:
        add("Medium", "Aggressive rent growth", f"Rent growth is {a.rent_growth:.1%}; the memo should justify the leasing market outlook.")
    if a.exit_cap_rate < m["entry_cap_rate"] - 0.005:
        add("Medium", "Exit cap compression dependency", f"Exit cap is {a.exit_cap_rate:.1%} vs entry cap of {m['entry_cap_rate']:.1%}.")
    if m["sale_profit_share"] > 0.65:
        add("Medium", "Exit value dependency", f"Sale proceeds represent {m['sale_profit_share']:.1%} of positive equity cash flow.")
    if abs(m["sources_uses_check"]) > 1:
        add("High", "Sources and uses mismatch", f"Sources and uses differ by KRW {m['sources_uses_check']:,.0f}.")
    if m["year1_debt_yield"] < 0.07:
        add("Low", "Low debt yield", f"Year 1 debt yield is {m['year1_debt_yield']:.1%}; lender underwriting may require support.")
    if not risks:
        add("Info", "No major rule-based alerts", "The base case passes the MVP risk checks. Market evidence still needs to be reviewed.")
    return risks

