from __future__ import annotations

from dataclasses import dataclass

from .models import DealAssumptions
from .source_tracker import AssetProfileItem, SourceItem


@dataclass(frozen=True)
class SampleDeal:
    name: str
    description: str
    assumptions: DealAssumptions
    asset_profile: list[AssetProfileItem]
    sources: list[SourceItem]


def sk_seorin_public_research_case() -> SampleDeal:
    """Public-research case built around SK Seorin Building.

    This is not a claim to reproduce the exact private underwriting model.
    The point is to show how public disclosures, REIT sources, market reports,
    and explicit modeling assumptions can be separated before underwriting.
    """
    assumptions = DealAssumptions(
        deal_name="Public Research Case - SK Seorin Building",
        purchase_price=1_000_000_000_000,
        leasable_area_sqm=60_000,
        occupancy_rate=1.00,
        annual_rent_per_sqm=1_000_000,
        annual_opex_per_sqm=160_000,
        rent_growth=0.02,
        vacancy_rate=0.02,
        capex_per_sqm=15_000,
        asset_management_fee_rate=0.003,
        acquisition_cost_rate=0.046,
        ltv=0.55,
        interest_rate=0.045,
        loan_fee_rate=0.010,
        holding_period_years=5,
        exit_cap_rate=0.0475,
        selling_cost_rate=0.010,
        discount_rate=0.085,
    )
    sources = [
        SourceItem(
            field="Deal / asset identity",
            value="SK Seorin Building office case",
            evidence_status="Public reference",
            source_type="Disclosure",
            confidence="High",
            source_name="DART electronic disclosure system",
            source_url="https://dart.fss.or.kr/",
            note="Use DART company/fund filings to verify the asset, issuer, transaction structure, and disclosed financial details.",
        ),
        SourceItem(
            field="REIT / real estate vehicle context",
            value="Public REIT/disclosure research route",
            evidence_status="Public reference",
            source_type="Disclosure",
            confidence="High",
            source_name="MOLIT REITs information system",
            source_url="https://reits.molit.go.kr/",
            note="Use the REITs information system to cross-check public REIT asset information and periodic reports.",
        ),
        SourceItem(
            field="Purchase price",
            value="KRW 1,000bn",
            evidence_status="To verify",
            source_type="Model Assumption",
            confidence="Medium",
            source_name="Public-deal underwriting assumption",
            source_url="https://dart.fss.or.kr/",
            note="Input as a rounded underwriting case value. Replace with confirmed acquisition price if extracted from filing.",
        ),
        SourceItem(
            field="Leasable area",
            value="60,000 sqm",
            evidence_status="Modeled estimate",
            source_type="Model Assumption",
            confidence="Low",
            source_name="Public-deal underwriting assumption",
            source_url="https://dart.fss.or.kr/",
            note="Modeled as rentable area for cash-flow sizing. Replace with disclosed leasable area or rent roll area if available.",
        ),
        SourceItem(
            field="Occupancy / vacancy",
            value="100.0% occupancy / 2.0% economic vacancy",
            evidence_status="Modeled estimate",
            source_type="Model Assumption",
            confidence="Medium",
            source_name="Stabilized office assumption",
            source_url="https://reits.molit.go.kr/",
            note="A stabilized single/anchor-tenant office case should still include economic vacancy or downtime stress.",
        ),
        SourceItem(
            field="Rent and opex",
            value="KRW 1,000,000 rent per sqm / KRW 160,000 opex per sqm",
            evidence_status="Modeled estimate",
            source_type="Model Assumption",
            confidence="Low",
            source_name="Underwriting assumption informed by Seoul office market references",
            source_url="https://www.jll.com/ko-kr/insights/market-dynamics",
            note="Use market reports from JLL/CBRE/Savills/Colliers to replace this with district-specific rent and opex assumptions.",
        ),
        SourceItem(
            field="LTV / interest rate",
            value="55.0% LTV / 4.5% interest rate",
            evidence_status="Modeled estimate",
            source_type="Model Assumption",
            confidence="Medium",
            source_name="Debt underwriting assumption",
            source_url="https://dart.fss.or.kr/",
            note="Replace with disclosed loan terms where available. Otherwise treat as a financing scenario to test DSCR and debt yield.",
        ),
        SourceItem(
            field="Exit cap rate",
            value="4.75%",
            evidence_status="Public reference",
            source_type="Market Report",
            confidence="Medium",
            source_name="Seoul office market report reference route",
            source_url="https://www.jll.com/ko-kr/insights/market-dynamics",
            note="Use market reports to defend the exit cap assumption. Sensitivity should show 25~50bp widening cases.",
        ),
    ]
    asset_profile = [
        AssetProfileItem(
            item="Asset",
            value="SK Seorin Building / SK Building public research case",
            evidence_status="Public reference",
            source_name="Art Center Nabi public profile",
            source_url="https://en.wikipedia.org/wiki/Art_Center_Nabi",
            memo_use="Identify the modeled asset as the SK Building context rather than a purely hypothetical office.",
        ),
        AssetProfileItem(
            item="Address",
            value="26, Jong-ro, Jongno-gu, Seoul",
            evidence_status="Public reference",
            source_name="Art Center Nabi public profile",
            source_url="https://en.wikipedia.org/wiki/Art_Center_Nabi",
            memo_use="Use as the memo's location line and to place the asset in the CBD/Jongno office market.",
        ),
        AssetProfileItem(
            item="District / submarket",
            value="Seorin-dong, Jongno District, Seoul CBD",
            evidence_status="Public reference",
            source_name="Seorin-dong public profile",
            source_url="https://en.wikipedia.org/wiki/Seorin-dong",
            memo_use="Support the CBD location thesis and explain why office tenant demand should be benchmarked to central Seoul.",
        ),
        AssetProfileItem(
            item="Road / transit context",
            value="Jong-ro is a major east-west road in downtown Seoul; Jonggak Station and the Jongno office cluster are nearby.",
            evidence_status="Public reference",
            source_name="Jongno public profile",
            source_url="https://en.wikipedia.org/wiki/Jongno",
            memo_use="Use as qualitative support for accessibility and CBD tenant demand.",
        ),
        AssetProfileItem(
            item="Tenant / group context",
            value="The asset is associated with SK Group; Art Center Nabi is described as located on the 4th floor of SK Building.",
            evidence_status="Public reference",
            source_name="Art Center Nabi / SK Group public profiles",
            source_url="https://en.wikipedia.org/wiki/SK_Group",
            memo_use="Frame the case as a stabilized office with anchor-tenant/group occupancy characteristics, subject to verification in filings.",
        ),
        AssetProfileItem(
            item="Market evidence route",
            value="Seoul CBD office rent, vacancy, and cap-rate assumptions should be checked against broker market reports.",
            evidence_status="Public reference",
            source_name="JLL Korea Market Dynamics",
            source_url="https://www.jll.com/ko-kr/insights/market-dynamics",
            memo_use="Use to justify why rent growth, vacancy, and exit cap are treated as sensitivity variables rather than fixed facts.",
        ),
    ]
    return SampleDeal(
        name="SK Seorin Building public research case",
        description=(
            "A public-source underwriting case for a stabilized Seoul CBD office asset. "
            "Known public information should be replaced as it is extracted from DART, REIT disclosures, and market reports."
        ),
        assumptions=assumptions,
        asset_profile=asset_profile,
        sources=sources,
    )


def sample_deals() -> dict[str, SampleDeal]:
    deal = sk_seorin_public_research_case()
    return {deal.name: deal}
