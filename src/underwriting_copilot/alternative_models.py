from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pandas as pd

from .engine import irr, npv


ModelType = Literal[
    "income_property",
    "contracted_infrastructure",
    "private_credit",
    "private_equity_lbo",
    "fund_nav",
]


@dataclass(frozen=True)
class AlternativeAssetTemplate:
    asset_class: str
    group: str
    model_type: ModelType
    public_case: str
    source_route: str
    public_data_hint: str
    core_question: str
    key_drivers: tuple[str, ...]
    required_diligence: tuple[str, ...]
    confirmed_examples: tuple[str, ...]
    estimated_examples: tuple[str, ...]


@dataclass(frozen=True)
class GenericAlternativeAssumptions:
    asset_class: str
    model_type: ModelType
    case_name: str
    initial_investment: float
    holding_period_years: int = 5
    revenue_year1: float = 10_000_000
    revenue_growth: float = 0.03
    ebitda_margin: float = 0.55
    capex_pct_revenue: float = 0.08
    debt_pct: float = 0.45
    interest_rate: float = 0.055
    exit_cap_rate: float = 0.055
    exit_multiple: float = 10.0
    coupon_rate: float = 0.10
    annual_default_rate: float = 0.015
    recovery_rate: float = 0.60
    nav_growth: float = 0.06
    entry_nav_discount: float = 0.10
    annual_distribution_yield: float = 0.06
    discount_rate: float = 0.09

    def validate(self) -> None:
        if self.initial_investment <= 0:
            raise ValueError("initial_investment must be positive.")
        if self.holding_period_years < 2:
            raise ValueError("holding_period_years must be at least 2.")
        if not 0 <= self.debt_pct <= 0.9:
            raise ValueError("debt_pct must be between 0 and 0.9.")
        if self.exit_cap_rate <= 0:
            raise ValueError("exit_cap_rate must be positive.")


@dataclass(frozen=True)
class GenericAlternativeResult:
    assumptions: GenericAlternativeAssumptions
    cash_flow: pd.DataFrame
    metrics: dict[str, float]
    equity_cash_flows: list[float]
    memo: str


def alternative_asset_catalog() -> list[AlternativeAssetTemplate]:
    return [
        AlternativeAssetTemplate(
            "Office",
            "Real Estate",
            "income_property",
            "SK Seorin Building public research case",
            "DART, MOLIT REITs, broker market reports",
            "Public filings and broker reports can support asset identity, market rent, vacancy, and cap-rate assumptions.",
            "Are rental income, vacancy, tenant rollover, leverage, and exit cap assumptions internally consistent?",
            ("NOI", "occupancy", "tenant stability", "rent growth", "exit cap", "LTV", "DSCR"),
            ("rent roll", "lease expiry", "tenant credit", "market rent", "capex", "debt terms"),
            ("location", "issuer/fund disclosure route", "market report route"),
            ("rent per sqm", "opex", "exit cap", "economic vacancy"),
        ),
        AlternativeAssetTemplate(
            "Logistics",
            "Real Estate",
            "income_property",
            "Prologis-style logistics portfolio case",
            "REIT annual reports, investor supplements, market rent reports",
            "Large public logistics REITs disclose portfolio scale, occupancy, rent growth commentary, and market exposures.",
            "Is warehouse cash flow supported by location, tenant demand, market rent growth, and replacement-cost discipline?",
            ("NOI", "same-store rent growth", "occupancy", "lease rollover", "market rent", "capex", "exit cap"),
            ("tenant concentration", "lease maturity", "market supply", "transport access", "development pipeline"),
            ("portfolio scale", "occupancy commentary", "market exposure"),
            ("asset-level rent", "asset-level opex", "exit cap", "leasing downtime"),
        ),
        AlternativeAssetTemplate(
            "Data Center",
            "Real Estate / Infrastructure",
            "income_property",
            "Equinix/Digital Realty-style data center case",
            "Public company filings, investor presentations, data center market reports",
            "Public data center operators disclose capacity, revenue growth, interconnection/cloud demand, and capital intensity.",
            "Do power availability, utilization, contract durability, and capex support the modeled cash flow?",
            ("MW capacity", "utilization", "power cost", "customer churn", "EBITDA margin", "capex", "exit multiple"),
            ("power procurement", "tenant contracts", "cooling/PUE", "AI demand", "development capex", "regulation"),
            ("operator footprint", "public growth targets", "reported margins"),
            ("asset-level utilization", "power tariff", "customer mix", "exit multiple"),
        ),
        AlternativeAssetTemplate(
            "Multifamily / Residential Rental",
            "Real Estate",
            "income_property",
            "Public REIT residential portfolio case",
            "REIT annual reports, apartment market reports, public housing statistics",
            "Residential REITs and market reports disclose occupancy, rent growth, supply, and regional exposure.",
            "Are rent growth, occupancy, turnover, and maintenance capex assumptions resilient across cycles?",
            ("occupancy", "rent growth", "turnover", "maintenance capex", "NOI margin", "exit cap"),
            ("regulation", "affordability", "supply pipeline", "tenant turnover", "maintenance burden"),
            ("portfolio occupancy", "market/submarket route", "rent growth commentary"),
            ("unit-level rent", "asset-level opex", "capex", "exit cap"),
        ),
        AlternativeAssetTemplate(
            "Hotel / Hospitality",
            "Real Estate Operating Asset",
            "income_property",
            "Public hotel REIT case",
            "Hotel REIT reports, STR-style market reports, tourism statistics",
            "Hotel REITs disclose RevPAR, occupancy, ADR, EBITDA margins, and market exposure.",
            "Can occupancy, ADR, RevPAR recovery, and operating leverage support the target return?",
            ("occupancy", "ADR", "RevPAR", "EBITDA margin", "renovation capex", "seasonality", "exit multiple"),
            ("brand/franchise", "management contract", "tourism demand", "renovation cycle", "labor cost"),
            ("reported RevPAR trend", "portfolio market exposure", "brand affiliation route"),
            ("asset-level occupancy", "ADR", "renovation capex", "exit multiple"),
        ),
        AlternativeAssetTemplate(
            "Renewable Power",
            "Infrastructure",
            "contracted_infrastructure",
            "Project Orion offshore wind educational case",
            "IM-style case materials, public PPA/renewable market references",
            "Renewable assets can be modeled from capacity, P50/P90 production, PPA contracts, merchant price, O&M, and debt sizing.",
            "Is downside production and merchant exposure still financeable under DSCR constraints?",
            ("MW", "P50/P90", "PPA price", "merchant exposure", "O&M", "degradation", "DSCR"),
            ("resource study", "PPA tenor", "offtaker credit", "interconnection", "curtailment", "availability"),
            ("capacity", "PPA structure in case material", "base-year revenue/opex"),
            ("merchant price", "terminal multiple", "debt sizing", "availability assumptions"),
        ),
        AlternativeAssetTemplate(
            "Toll Road / Transportation PPP",
            "Infrastructure",
            "contracted_infrastructure",
            "Public toll road concession case",
            "Concession reports, traffic statistics, listed infrastructure operator filings",
            "Public operators often disclose traffic volume, toll revenue, concession life, and maintenance capex.",
            "Do traffic volume, toll escalation, concession life, and maintenance capex support stable distributions?",
            ("traffic volume", "toll rate", "escalation", "concession life", "maintenance capex", "DSCR"),
            ("traffic study", "tariff regulation", "concession agreement", "capex backlog", "refinancing risk"),
            ("traffic/revenue history route", "concession term route", "operator disclosure route"),
            ("traffic growth", "major maintenance", "terminal value", "debt amortization"),
        ),
        AlternativeAssetTemplate(
            "Private Credit / Direct Lending",
            "Private Debt",
            "private_credit",
            "Public BDC portfolio case",
            "BDC annual reports, SEC filings, investor presentations",
            "Public BDCs disclose portfolio yield, non-accruals, industry mix, leverage, and realized/unrealized gains.",
            "Is the coupon enough to compensate for default loss, recovery uncertainty, leverage, and illiquidity?",
            ("coupon", "spread", "default rate", "recovery", "non-accrual", "portfolio diversification", "leverage"),
            ("borrower EBITDA", "covenants", "seniority", "industry exposure", "sponsor quality", "amendments"),
            ("portfolio yield", "asset mix", "non-accrual disclosure", "leverage"),
            ("forward default rate", "recovery rate", "prepayment", "fee income"),
        ),
        AlternativeAssetTemplate(
            "Private Equity Buyout",
            "Private Equity",
            "private_equity_lbo",
            "Public company LBO teaching case",
            "Public company filings, comparable company trading multiples, transaction precedents",
            "A public company can be used as a teaching case because revenue, EBITDA, debt, and comparable multiples are observable.",
            "Can EBITDA growth, deleveraging, and exit multiple support target equity returns?",
            ("entry EBITDA", "purchase multiple", "debt multiple", "EBITDA growth", "deleveraging", "exit multiple"),
            ("quality of earnings", "working capital", "capex", "management plan", "multiple contraction", "debt covenants"),
            ("public financial statements", "market comparable route", "share price route"),
            ("entry premium", "debt capacity", "exit multiple", "operating improvement"),
        ),
        AlternativeAssetTemplate(
            "Secondaries / Fund NAV",
            "Private Funds",
            "fund_nav",
            "Listed private equity trust discount-to-NAV case",
            "Listed PE trust reports, NAV statements, portfolio reports",
            "Listed private equity funds disclose NAV, discount/premium, distributions, and portfolio composition.",
            "Does entry discount, NAV growth, and distribution yield compensate for J-curve and liquidity risk?",
            ("NAV discount", "NAV growth", "distribution yield", "unfunded commitments", "liquidity", "duration"),
            ("portfolio valuation", "vintage mix", "unfunded commitments", "FX", "exit environment", "fees"),
            ("NAV", "share price discount route", "distribution policy"),
            ("forward NAV growth", "exit timing", "haircut", "liquidity discount"),
        ),
    ]


def catalog_rows() -> list[dict[str, str]]:
    return [
        {
            "Asset Class": item.asset_class,
            "Group": item.group,
            "Model Type": item.model_type,
            "Public Research Case": item.public_case,
            "Public Source Route": item.source_route,
            "Core Underwriting Question": item.core_question,
            "Key Drivers": ", ".join(item.key_drivers),
        }
        for item in alternative_asset_catalog()
    ]


def template_by_asset_class(asset_class: str) -> AlternativeAssetTemplate:
    for item in alternative_asset_catalog():
        if item.asset_class == asset_class:
            return item
    raise KeyError(f"Unknown asset class: {asset_class}")


def default_generic_assumptions(asset_class: str) -> GenericAlternativeAssumptions:
    template = template_by_asset_class(asset_class)
    defaults = {
        "Logistics": dict(initial_investment=250_000_000, revenue_year1=18_000_000, ebitda_margin=0.70, revenue_growth=0.035, exit_cap_rate=0.055, debt_pct=0.50),
        "Data Center": dict(initial_investment=600_000_000, revenue_year1=55_000_000, ebitda_margin=0.52, revenue_growth=0.08, capex_pct_revenue=0.20, exit_multiple=14.0, debt_pct=0.45),
        "Multifamily / Residential Rental": dict(initial_investment=180_000_000, revenue_year1=12_000_000, ebitda_margin=0.62, revenue_growth=0.03, exit_cap_rate=0.052, debt_pct=0.50),
        "Hotel / Hospitality": dict(initial_investment=220_000_000, revenue_year1=32_000_000, ebitda_margin=0.30, revenue_growth=0.04, capex_pct_revenue=0.06, exit_multiple=11.0, debt_pct=0.45),
        "Toll Road / Transportation PPP": dict(initial_investment=450_000_000, revenue_year1=38_000_000, ebitda_margin=0.68, revenue_growth=0.025, capex_pct_revenue=0.12, exit_multiple=12.0, debt_pct=0.60),
        "Private Credit / Direct Lending": dict(initial_investment=100_000_000, coupon_rate=0.105, annual_default_rate=0.018, recovery_rate=0.60, debt_pct=0.0),
        "Private Equity Buyout": dict(initial_investment=300_000_000, revenue_year1=75_000_000, ebitda_margin=0.22, revenue_growth=0.06, capex_pct_revenue=0.04, exit_multiple=9.5, debt_pct=0.55),
        "Secondaries / Fund NAV": dict(initial_investment=100_000_000, nav_growth=0.07, entry_nav_discount=0.15, annual_distribution_yield=0.05, debt_pct=0.0),
    }
    return GenericAlternativeAssumptions(
        asset_class=asset_class,
        model_type=template.model_type,
        case_name=template.public_case,
        **defaults.get(asset_class, dict(initial_investment=100_000_000)),
    )


def underwrite_generic(assumptions: GenericAlternativeAssumptions) -> GenericAlternativeResult:
    assumptions.validate()
    if assumptions.model_type == "private_credit":
        return _underwrite_private_credit(assumptions)
    if assumptions.model_type == "private_equity_lbo":
        return _underwrite_lbo(assumptions)
    if assumptions.model_type == "fund_nav":
        return _underwrite_fund_nav(assumptions)
    return _underwrite_cash_flow_asset(assumptions)


def _metrics(assumptions: GenericAlternativeAssumptions, equity_cfs: list[float]) -> dict[str, float]:
    positive_cf = sum(cf for cf in equity_cfs[1:] if cf > 0)
    return {
        "equity_invested": -equity_cfs[0],
        "levered_irr": irr(equity_cfs),
        "equity_multiple": positive_cf / (-equity_cfs[0]) if equity_cfs[0] else float("nan"),
        "npv": npv(assumptions.discount_rate, equity_cfs),
    }


def _underwrite_cash_flow_asset(assumptions: GenericAlternativeAssumptions) -> GenericAlternativeResult:
    debt = assumptions.initial_investment * assumptions.debt_pct
    equity = assumptions.initial_investment - debt
    annual_principal = debt / assumptions.holding_period_years if assumptions.holding_period_years else 0
    balance = debt
    rows = []
    equity_cfs = [-equity]
    for year in range(1, assumptions.holding_period_years + 1):
        revenue = assumptions.revenue_year1 * ((1 + assumptions.revenue_growth) ** (year - 1))
        ebitda = revenue * assumptions.ebitda_margin
        capex = revenue * assumptions.capex_pct_revenue
        interest = balance * assumptions.interest_rate
        principal = min(balance, annual_principal)
        balance -= principal
        debt_service = interest + principal
        unlevered_cf = ebitda - capex
        terminal_value = 0.0
        if year == assumptions.holding_period_years:
            if assumptions.asset_class in {"Logistics", "Multifamily / Residential Rental"}:
                terminal_value = (ebitda - capex) * (1 + assumptions.revenue_growth) / assumptions.exit_cap_rate
            else:
                terminal_value = ebitda * assumptions.exit_multiple
        equity_cf = unlevered_cf - debt_service + terminal_value - (balance if year == assumptions.holding_period_years else 0)
        rows.append(
            {
                "Year": year,
                "Revenue": revenue,
                "EBITDA / NOI": ebitda,
                "Maintenance CAPEX": capex,
                "Debt Service": debt_service,
                "Terminal Value": terminal_value,
                "Equity Cash Flow": equity_cf,
                "Ending Debt": 0 if year == assumptions.holding_period_years else balance,
            }
        )
        equity_cfs.append(equity_cf)
    metrics = _metrics(assumptions, equity_cfs)
    metrics["terminal_value"] = rows[-1]["Terminal Value"]
    metrics["year1_ebitda_or_noi"] = rows[0]["EBITDA / NOI"]
    return GenericAlternativeResult(
        assumptions,
        pd.DataFrame(rows),
        metrics,
        equity_cfs,
        _generic_memo(assumptions, metrics),
    )


def _underwrite_private_credit(assumptions: GenericAlternativeAssumptions) -> GenericAlternativeResult:
    principal = assumptions.initial_investment
    rows = []
    equity_cfs = [-principal]
    performing_balance = principal
    for year in range(1, assumptions.holding_period_years + 1):
        defaulted = performing_balance * assumptions.annual_default_rate
        recovered = defaulted * assumptions.recovery_rate
        credit_loss = defaulted - recovered
        performing_balance -= defaulted
        coupon_income = performing_balance * assumptions.coupon_rate
        principal_repayment = performing_balance if year == assumptions.holding_period_years else 0
        cf = coupon_income + recovered + principal_repayment
        rows.append(
            {
                "Year": year,
                "Performing Balance": performing_balance,
                "Coupon Income": coupon_income,
                "Defaulted Principal": defaulted,
                "Recovery": recovered,
                "Credit Loss": credit_loss,
                "Principal Repayment": principal_repayment,
                "Equity Cash Flow": cf,
            }
        )
        equity_cfs.append(cf)
    metrics = _metrics(assumptions, equity_cfs)
    metrics["expected_loss_year1"] = principal * assumptions.annual_default_rate * (1 - assumptions.recovery_rate)
    metrics["net_coupon_after_loss"] = assumptions.coupon_rate - assumptions.annual_default_rate * (1 - assumptions.recovery_rate)
    return GenericAlternativeResult(assumptions, pd.DataFrame(rows), metrics, equity_cfs, _generic_memo(assumptions, metrics))


def _underwrite_lbo(assumptions: GenericAlternativeAssumptions) -> GenericAlternativeResult:
    debt = assumptions.initial_investment * assumptions.debt_pct
    equity = assumptions.initial_investment - debt
    annual_principal = debt / assumptions.holding_period_years
    balance = debt
    rows = []
    equity_cfs = [-equity]
    for year in range(1, assumptions.holding_period_years + 1):
        revenue = assumptions.revenue_year1 * ((1 + assumptions.revenue_growth) ** (year - 1))
        ebitda = revenue * assumptions.ebitda_margin
        capex = revenue * assumptions.capex_pct_revenue
        interest = balance * assumptions.interest_rate
        principal = min(balance, annual_principal)
        balance -= principal
        fcf_after_debt = ebitda - capex - interest - principal
        exit_value = ebitda * assumptions.exit_multiple if year == assumptions.holding_period_years else 0
        equity_cf = fcf_after_debt + exit_value - (balance if year == assumptions.holding_period_years else 0)
        rows.append(
            {
                "Year": year,
                "Revenue": revenue,
                "EBITDA": ebitda,
                "CAPEX": capex,
                "Interest": interest,
                "Principal": principal,
                "Exit Enterprise Value": exit_value,
                "Equity Cash Flow": equity_cf,
                "Ending Debt": 0 if year == assumptions.holding_period_years else balance,
            }
        )
        equity_cfs.append(equity_cf)
    metrics = _metrics(assumptions, equity_cfs)
    metrics["exit_enterprise_value"] = rows[-1]["Exit Enterprise Value"]
    metrics["debt_paydown"] = debt
    return GenericAlternativeResult(assumptions, pd.DataFrame(rows), metrics, equity_cfs, _generic_memo(assumptions, metrics))


def _underwrite_fund_nav(assumptions: GenericAlternativeAssumptions) -> GenericAlternativeResult:
    implied_nav = assumptions.initial_investment / (1 - assumptions.entry_nav_discount)
    nav = implied_nav
    rows = []
    equity_cfs = [-assumptions.initial_investment]
    for year in range(1, assumptions.holding_period_years + 1):
        distribution = nav * assumptions.annual_distribution_yield
        nav = (nav - distribution) * (1 + assumptions.nav_growth)
        terminal_nav = nav if year == assumptions.holding_period_years else 0
        cf = distribution + terminal_nav
        rows.append(
            {
                "Year": year,
                "Beginning NAV": implied_nav if year == 1 else rows[-1]["Ending NAV"],
                "Distribution": distribution,
                "NAV Growth Rate": assumptions.nav_growth,
                "Ending NAV": nav,
                "Terminal NAV": terminal_nav,
                "Equity Cash Flow": cf,
            }
        )
        equity_cfs.append(cf)
    metrics = _metrics(assumptions, equity_cfs)
    metrics["entry_implied_nav"] = implied_nav
    metrics["entry_nav_discount"] = assumptions.entry_nav_discount
    return GenericAlternativeResult(assumptions, pd.DataFrame(rows), metrics, equity_cfs, _generic_memo(assumptions, metrics))


def _generic_memo(assumptions: GenericAlternativeAssumptions, metrics: dict[str, float]) -> str:
    template = template_by_asset_class(assumptions.asset_class)
    diligence = "\n".join(f"- {item}" for item in template.required_diligence)
    return f"""# {assumptions.asset_class} Underwriting Memo Draft

## Public Research Case
{template.public_case}

## Core Question
{template.core_question}

## Key Metrics
- Levered IRR: {metrics['levered_irr']:.1%}
- Equity Multiple: {metrics['equity_multiple']:.2f}x
- NPV: {metrics['npv']:,.0f}

## Evidence Discipline
- Public data route: {template.source_route}
- Confirmed/public examples: {", ".join(template.confirmed_examples)}
- Modeled estimate examples: {", ".join(template.estimated_examples)}

## Diligence Checklist
{diligence}
"""
