from __future__ import annotations

from dataclasses import dataclass


from .alternative_models import alternative_asset_catalog


@dataclass(frozen=True)
class ModelDesignStep:
    step: str
    office_logic: str
    infrastructure_logic: str


def model_design_steps() -> list[ModelDesignStep]:
    return [
        ModelDesignStep(
            step="1. Cash flow source",
            office_logic="Rent, occupancy, operating expense, CAPEX, and exit cap drive NOI and sale value.",
            infrastructure_logic="Generation volume, PPA contracted volume, merchant price, O&M, and asset life drive project cash flow.",
        ),
        ModelDesignStep(
            step="2. Core operating driver",
            office_logic="Leasable area x rent x occupancy, adjusted for vacancy and operating expense.",
            infrastructure_logic="MW capacity x hours x capacity factor, adjusted for P50/P90 production and degradation.",
        ),
        ModelDesignStep(
            step="3. Revenue contract",
            office_logic="Lease terms and tenant credit determine rental durability.",
            infrastructure_logic="PPA tenor, contracted percentage, offtaker credit, and merchant exposure determine revenue durability.",
        ),
        ModelDesignStep(
            step="4. Valuation approach",
            office_logic="Exit value is commonly modeled as next-year NOI divided by exit cap rate.",
            infrastructure_logic="Value is commonly based on contracted cash flow, project IRR, terminal value, or remaining concession/PPA life.",
        ),
        ModelDesignStep(
            step="5. Debt metrics",
            office_logic="DSCR, ICR, LTV, and debt yield are the main lender-oriented checks.",
            infrastructure_logic="DSCR, LLCR, debt sculpting, reserve accounts, and downside P90 DSCR are central.",
        ),
        ModelDesignStep(
            step="6. Risk focus",
            office_logic="Vacancy, rent growth, tenant rollover, exit cap, and refinancing risk.",
            infrastructure_logic="Resource risk, curtailment, merchant price, offtaker credit, O&M availability, and regulatory risk.",
        ),
    ]


def model_design_rows() -> list[dict[str, str]]:
    base_rows = [
        {
            "Model Step": item.step,
            "Office Model Logic": item.office_logic,
            "Infrastructure Model Logic": item.infrastructure_logic,
        }
        for item in model_design_steps()
    ]
    base_rows.append(
        {
            "Model Step": "7. Expandable asset-class routing",
            "Office Model Logic": "Detailed office engine is used when asset class is Office.",
            "Infrastructure Model Logic": "Detailed renewable infrastructure engine is used for Renewable Power; other asset classes use the template engine until a dedicated model is added.",
        }
    )
    return base_rows


def asset_class_positioning(asset_class: str) -> str:
    if asset_class == "Office":
        return (
            "Office underwriting is an income-producing real estate model. The model starts from rent, "
            "vacancy, operating expense, and exit cap assumptions, then evaluates NOI durability, leverage, "
            "and sale-value sensitivity."
        )
    if asset_class == "Infrastructure - Renewable Power":
        return (
        "Renewable infrastructure underwriting is a project cash-flow model. The model starts from generation "
        "volume, PPA contracts, merchant exposure, O&M, and project life, then evaluates contracted revenue "
        "quality, DSCR, and downside production/price risk."
        )
    for item in alternative_asset_catalog():
        if item.asset_class == asset_class:
            return f"{item.group} template model. {item.core_question}"
    return "Select an alternative asset class to see the relevant underwriting template."
