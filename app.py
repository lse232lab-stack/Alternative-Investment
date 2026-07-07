from __future__ import annotations

from pathlib import Path
import sys
import tempfile

sys.path.append(str(Path(__file__).parent / "src"))

import streamlit as st

from underwriting_copilot import DealAssumptions, underwrite
from underwriting_copilot.alternative_models import (
    alternative_asset_catalog,
    catalog_rows,
    default_generic_assumptions,
    underwrite_generic,
)
from underwriting_copilot.asset_router import asset_class_positioning, model_design_rows
from underwriting_copilot.detailed_models import (
    DataCenterAssumptions,
    LBOAssumptions,
    LogisticsAssumptions,
    PrivateCreditAssumptions,
    detailed_asset_classes,
    underwrite_data_center,
    underwrite_lbo,
    underwrite_logistics,
    underwrite_private_credit,
)
from underwriting_copilot.excel_export import export_excel
from underwriting_copilot.infra_models import InfraAssumptions, infra_memo, underwrite_infra
from underwriting_copilot.institution_lens import build_institution_views
from underwriting_copilot.memo import generate_korean_memo
from underwriting_copilot.risk import scan_risks
from underwriting_copilot.sample_deals import sample_deals
from underwriting_copilot.sensitivity import exit_cap_rent_growth_table, max_purchase_price_for_target_irr
from underwriting_copilot.source_tracker import source_items_as_rows
from underwriting_copilot.source_tracker import asset_profile_as_rows


st.set_page_config(page_title="Alternative Investment Underwriting Copilot", layout="wide")
st.title("Alternative Investment Underwriting Copilot")

available_samples = sample_deals()
scenario_names = ["Base hypothetical office deal"] + list(available_samples.keys())
asset_library = alternative_asset_catalog()
asset_names = ["Office", "Infrastructure - Renewable Power"] + [
    item.asset_class
    for item in asset_library
    if item.asset_class not in {"Office", "Renewable Power"}
]

with st.sidebar:
    st.header("Asset Class")
    asset_class = st.selectbox("Select Asset Class", asset_names)
    st.caption(asset_class_positioning(asset_class))

library_tab, model_tab = st.tabs(["Asset Class Library", "Selected Model"])
with library_tab:
    st.subheader("Alternative Investment Asset Class Library")
    st.caption(
        "The project uses detailed engines for Office and Renewable Infrastructure, then template models for adjacent alternative asset classes. "
        "Each template records the public-data route, confirmed vs. estimated inputs, and the diligence questions that should be answered before a real investment decision."
    )
    st.dataframe(catalog_rows(), use_container_width=True)
    st.subheader("Model Design Framework")
    st.dataframe(model_design_rows(), use_container_width=True)

with model_tab:
    st.subheader(asset_class)

if asset_class in detailed_asset_classes():
    with st.sidebar:
        st.header("Detailed Model Assumptions")

    if asset_class == "Logistics":
        base = LogisticsAssumptions()
        with st.sidebar:
            acquisition_price = st.number_input("Acquisition Price", value=int(base.acquisition_price), step=5_000_000)
            area = st.number_input("Net Leasable Area sqm", value=int(base.net_leasable_area_sqm), step=5_000)
            occupancy = st.slider("Occupancy", 0.0, 1.0, base.occupancy_rate, 0.01)
            rent = st.number_input("Rent / sqm / year", value=float(base.rent_per_sqm_year), step=5.0)
            growth = st.slider("Market Rent Growth", 0.0, 0.12, base.market_rent_growth, 0.005)
            renewal_spread = st.slider("Renewal Spread", -0.10, 0.30, base.renewal_spread, 0.01)
            opex_ratio = st.slider("Opex Ratio", 0.0, 0.6, base.opex_ratio, 0.01)
            ltv = st.slider("LTV", 0.0, 0.8, base.ltv, 0.01)
            interest_rate = st.slider("Interest Rate", 0.0, 0.12, base.interest_rate, 0.005)
            exit_cap = st.slider("Exit Cap", 0.025, 0.10, base.exit_cap_rate, 0.0025)
        detailed_result = underwrite_logistics(
            LogisticsAssumptions(
                acquisition_price=float(acquisition_price),
                net_leasable_area_sqm=float(area),
                occupancy_rate=float(occupancy),
                rent_per_sqm_year=float(rent),
                market_rent_growth=float(growth),
                renewal_spread=float(renewal_spread),
                opex_ratio=float(opex_ratio),
                ltv=float(ltv),
                interest_rate=float(interest_rate),
                exit_cap_rate=float(exit_cap),
            )
        )
    elif asset_class == "Data Center":
        base = DataCenterAssumptions()
        with st.sidebar:
            acquisition_price = st.number_input("Acquisition Price", value=int(base.acquisition_price), step=10_000_000)
            critical_it_mw = st.number_input("Critical IT MW", value=float(base.critical_it_mw), step=2.0)
            utilization = st.slider("Utilization", 0.0, 1.0, base.stabilized_utilization, 0.01)
            rent_per_kw = st.number_input("Rent / kW / month", value=float(base.rent_per_kw_month), step=5.0)
            rent_escalation = st.slider("Rent Escalation", 0.0, 0.08, base.rent_escalation, 0.005)
            power_cost_pct = st.slider("Power Cost % Revenue", 0.0, 0.5, base.power_cost_pct_revenue, 0.01)
            facility_opex_pct = st.slider("Facility Opex % Revenue", 0.0, 0.5, base.facility_opex_pct_revenue, 0.01)
            ltv = st.slider("LTV", 0.0, 0.75, base.ltv, 0.01)
            exit_multiple = st.slider("Exit EBITDA Multiple", 6.0, 25.0, base.exit_ebitda_multiple, 0.5)
        detailed_result = underwrite_data_center(
            DataCenterAssumptions(
                acquisition_price=float(acquisition_price),
                critical_it_mw=float(critical_it_mw),
                stabilized_utilization=float(utilization),
                rent_per_kw_month=float(rent_per_kw),
                rent_escalation=float(rent_escalation),
                power_cost_pct_revenue=float(power_cost_pct),
                facility_opex_pct_revenue=float(facility_opex_pct),
                ltv=float(ltv),
                exit_ebitda_multiple=float(exit_multiple),
            )
        )
    elif asset_class == "Private Credit / Direct Lending":
        base = PrivateCreditAssumptions()
        with st.sidebar:
            principal = st.number_input("Portfolio Principal", value=int(base.portfolio_principal), step=5_000_000)
            coupon = st.slider("Coupon Rate", 0.0, 0.20, base.coupon_rate, 0.005)
            upfront_fee = st.slider("Upfront Fee", 0.0, 0.05, base.upfront_fee_rate, 0.005)
            default_rate = st.slider("Annual Default Rate", 0.0, 0.12, base.annual_default_rate, 0.005)
            recovery = st.slider("Recovery Rate", 0.0, 1.0, base.recovery_rate, 0.05)
            prepayment = st.slider("Annual Prepayment Rate", 0.0, 0.30, base.annual_prepayment_rate, 0.01)
            reinvestment = st.slider("Reinvestment Rate", 0.0, 1.0, base.reinvestment_rate, 0.05)
        detailed_result = underwrite_private_credit(
            PrivateCreditAssumptions(
                portfolio_principal=float(principal),
                coupon_rate=float(coupon),
                upfront_fee_rate=float(upfront_fee),
                annual_default_rate=float(default_rate),
                recovery_rate=float(recovery),
                annual_prepayment_rate=float(prepayment),
                reinvestment_rate=float(reinvestment),
            )
        )
    else:
        base = LBOAssumptions()
        with st.sidebar:
            entry_ebitda = st.number_input("Entry EBITDA", value=int(base.entry_ebitda), step=5_000_000)
            entry_multiple = st.slider("Entry Multiple", 4.0, 15.0, base.entry_multiple, 0.5)
            debt_multiple = st.slider("Debt Multiple", 0.0, 8.0, base.debt_multiple, 0.25)
            growth = st.slider("EBITDA Growth Proxy", 0.0, 0.15, base.revenue_growth, 0.005)
            margin_expansion = st.slider("Margin Expansion", -0.02, 0.03, base.ebitda_margin_expansion, 0.005)
            interest_rate = st.slider("Debt Interest Rate", 0.0, 0.15, base.interest_rate, 0.005)
            cash_sweep = st.slider("Cash Sweep %", 0.0, 1.0, base.cash_sweep_pct, 0.05)
            exit_multiple = st.slider("Exit Multiple", 4.0, 15.0, base.exit_multiple, 0.5)
        detailed_result = underwrite_lbo(
            LBOAssumptions(
                entry_ebitda=float(entry_ebitda),
                entry_multiple=float(entry_multiple),
                debt_multiple=float(debt_multiple),
                revenue_growth=float(growth),
                ebitda_margin_expansion=float(margin_expansion),
                interest_rate=float(interest_rate),
                cash_sweep_pct=float(cash_sweep),
                exit_multiple=float(exit_multiple),
            )
        )

    metric_cols = st.columns(4)
    metric_cols[0].metric("Levered IRR", f"{detailed_result.metrics['levered_irr']:.1%}")
    metric_cols[1].metric("Equity Multiple", f"{detailed_result.metrics['equity_multiple']:.2f}x")
    metric_cols[2].metric("NPV", f"{detailed_result.metrics['npv']:,.0f}")
    metric_cols[3].metric("Equity Invested", f"{detailed_result.metrics['equity_invested']:,.0f}")

    tab1, tab2, tab3 = st.tabs(["Cash Flow", "Debt / Credit", "Memo"])
    with tab1:
        st.dataframe(detailed_result.cash_flow, use_container_width=True)
    with tab2:
        if detailed_result.debt_schedule.empty:
            st.info("This model is portfolio-credit oriented and does not use an acquisition debt schedule.")
        else:
            st.dataframe(detailed_result.debt_schedule, use_container_width=True)
    with tab3:
        st.markdown(detailed_result.memo)
    st.stop()

if asset_class not in {"Office", "Infrastructure - Renewable Power"}:
    template = next(item for item in asset_library if item.asset_class == asset_class)
    base_generic = default_generic_assumptions(asset_class)

    with st.sidebar:
        st.header("Template Assumptions")
        initial_investment = st.number_input("Initial Investment", value=int(base_generic.initial_investment), step=5_000_000)
        holding_period = st.slider("Holding Period", 3, 12, int(base_generic.holding_period_years), 1)
        revenue_year1 = st.number_input("Year 1 Revenue / Income", value=int(base_generic.revenue_year1), step=1_000_000)
        revenue_growth = st.slider("Revenue / NAV Growth", 0.0, 0.15, float(base_generic.revenue_growth), 0.005)
        ebitda_margin = st.slider("EBITDA / NOI Margin", 0.0, 0.9, float(base_generic.ebitda_margin), 0.01)
        capex_pct_revenue = st.slider("CAPEX % Revenue", 0.0, 0.35, float(base_generic.capex_pct_revenue), 0.01)
        debt_pct = st.slider("Debt %", 0.0, 0.85, float(base_generic.debt_pct), 0.01)
        generic_interest_rate = st.slider("Debt Interest Rate", 0.0, 0.15, float(base_generic.interest_rate), 0.005)
        exit_cap_rate = st.slider("Exit Cap Rate", 0.02, 0.12, float(base_generic.exit_cap_rate), 0.0025)
        exit_multiple = st.slider("Exit Multiple", 4.0, 20.0, float(base_generic.exit_multiple), 0.5)
        coupon_rate = st.slider("Private Credit Coupon", 0.0, 0.20, float(base_generic.coupon_rate), 0.005)
        annual_default_rate = st.slider("Annual Default Rate", 0.0, 0.10, float(base_generic.annual_default_rate), 0.005)
        recovery_rate = st.slider("Recovery Rate", 0.0, 1.0, float(base_generic.recovery_rate), 0.05)
        entry_nav_discount = st.slider("Entry NAV Discount", 0.0, 0.40, float(base_generic.entry_nav_discount), 0.01)
        annual_distribution_yield = st.slider("Distribution Yield", 0.0, 0.15, float(base_generic.annual_distribution_yield), 0.005)

    generic_assumptions = base_generic.__class__(
        asset_class=asset_class,
        model_type=template.model_type,
        case_name=template.public_case,
        initial_investment=float(initial_investment),
        holding_period_years=int(holding_period),
        revenue_year1=float(revenue_year1),
        revenue_growth=float(revenue_growth),
        ebitda_margin=float(ebitda_margin),
        capex_pct_revenue=float(capex_pct_revenue),
        debt_pct=float(debt_pct),
        interest_rate=float(generic_interest_rate),
        exit_cap_rate=float(exit_cap_rate),
        exit_multiple=float(exit_multiple),
        coupon_rate=float(coupon_rate),
        annual_default_rate=float(annual_default_rate),
        recovery_rate=float(recovery_rate),
        nav_growth=float(revenue_growth),
        entry_nav_discount=float(entry_nav_discount),
        annual_distribution_yield=float(annual_distribution_yield),
    )
    generic_result = underwrite_generic(generic_assumptions)

    metric_cols = st.columns(4)
    metric_cols[0].metric("Levered IRR", f"{generic_result.metrics['levered_irr']:.1%}")
    metric_cols[1].metric("Equity Multiple", f"{generic_result.metrics['equity_multiple']:.2f}x")
    metric_cols[2].metric("NPV", f"{generic_result.metrics['npv']:,.0f}")
    metric_cols[3].metric("Model Type", template.model_type)

    tab1, tab2, tab3, tab4 = st.tabs(["Cash Flow", "Public Data Route", "Diligence", "Memo"])
    with tab1:
        st.dataframe(generic_result.cash_flow, use_container_width=True)
    with tab2:
        st.write(f"**Public research case:** {template.public_case}")
        st.write(f"**Source route:** {template.source_route}")
        st.info(template.public_data_hint)
        st.write("**Confirmed / public examples**")
        for item in template.confirmed_examples:
            st.write(f"- {item}")
        st.write("**Modeled estimate examples**")
        for item in template.estimated_examples:
            st.write(f"- {item}")
    with tab3:
        st.write(f"**Core underwriting question:** {template.core_question}")
        st.write("**Key drivers**")
        for item in template.key_drivers:
            st.write(f"- {item}")
        st.write("**Required diligence**")
        for item in template.required_diligence:
            st.write(f"- {item}")
    with tab4:
        st.markdown(generic_result.memo)
    st.stop()

if asset_class == "Infrastructure - Renewable Power":
    with st.sidebar:
        st.header("Infrastructure Case")
        project_name = st.text_input("Project Name", "Project Orion - Offshore Wind")
        location = st.text_input("Location", "Texas, U.S.")
        capacity_mw_ac = st.number_input("Capacity MW AC", value=250, step=10)
        production_scenario = st.selectbox("Production Scenario", ["P50", "P90"])
        p50_mwh = st.number_input("P50 MWh", value=625_000, step=10_000)
        p90_mwh = st.number_input("P90 MWh", value=562_500, step=10_000)
        annual_degradation = st.slider("Annual Degradation", 0.0, 0.02, 0.003, 0.001)
        acquisition_price = st.number_input("Acquisition Price (USD)", value=180_000_000, step=5_000_000)
        debt_pct = st.slider("Debt %", 0.0, 0.85, 0.55, 0.01)
        infra_interest_rate = st.slider("Debt Interest Rate", 0.0, 0.12, 0.055, 0.005)
        merchant_price = st.number_input("Merchant Price ($/MWh)", value=30.0, step=1.0)
        infra_holding_period = st.slider("Holding Period", 5, 20, 10, 1)

    infra_assumptions = InfraAssumptions(
        project_name=project_name,
        location=location,
        capacity_mw_ac=float(capacity_mw_ac),
        p50_mwh=float(p50_mwh),
        p90_mwh=float(p90_mwh),
        production_scenario=production_scenario,
        annual_degradation=float(annual_degradation),
        acquisition_price=float(acquisition_price),
        debt_pct=float(debt_pct),
        interest_rate=float(infra_interest_rate),
        merchant_price_per_mwh=float(merchant_price),
        holding_period_years=int(infra_holding_period),
    )
    infra_result = underwrite_infra(infra_assumptions)

    metric_cols = st.columns(5)
    metric_cols[0].metric("Levered IRR", f"{infra_result.metrics['levered_irr']:.1%}")
    metric_cols[1].metric("Equity Multiple", f"{infra_result.metrics['equity_multiple']:.2f}x")
    metric_cols[2].metric("Min DSCR", f"{infra_result.metrics['min_dscr']:.2f}x")
    metric_cols[3].metric("Contracted Revenue", f"{infra_result.metrics['year1_contracted_revenue_pct']:.1%}")
    metric_cols[4].metric("Terminal Value", f"${infra_result.metrics['terminal_value'] / 1_000_000:,.1f}mn")

    tab1, tab2, tab3, tab4 = st.tabs(["Project CF", "Debt", "Returns", "Memo"])
    with tab1:
        st.dataframe(infra_result.project_cf, use_container_width=True)
    with tab2:
        st.dataframe(infra_result.debt_schedule, use_container_width=True)
    with tab3:
        st.dataframe(infra_result.returns, use_container_width=True)
    with tab4:
        st.markdown(infra_memo(infra_result))

    st.stop()

with st.sidebar:
    st.header("Research Case")
    scenario_name = st.selectbox("Load Deal Case", scenario_names)
    selected_sample = available_samples.get(scenario_name)
    base = selected_sample.assumptions if selected_sample else DealAssumptions()
    if selected_sample:
        st.caption(selected_sample.description)

    st.header("Deal Assumptions")
    deal_name = st.text_input("Deal Name", base.deal_name)
    purchase_price = st.number_input("Purchase Price (KRW)", value=int(base.purchase_price), step=5_000_000_000)
    leasable_area_sqm = st.number_input("Leasable Area (sqm)", value=int(base.leasable_area_sqm), step=1_000)
    occupancy_rate = st.slider("Occupancy Rate", 0.0, 1.0, float(base.occupancy_rate), 0.01)
    annual_rent_per_sqm = st.number_input("Annual Rent / sqm", value=int(base.annual_rent_per_sqm), step=10_000)
    annual_opex_per_sqm = st.number_input("Annual Opex / sqm", value=int(base.annual_opex_per_sqm), step=5_000)
    rent_growth = st.slider("Rent Growth", 0.0, 0.08, float(base.rent_growth), 0.005)
    vacancy_rate = st.slider("Vacancy Rate", 0.0, 0.3, float(base.vacancy_rate), 0.01)
    capex_per_sqm = st.number_input("CAPEX / sqm", value=int(base.capex_per_sqm), step=1_000)
    ltv = st.slider("LTV", 0.0, 0.85, float(base.ltv), 0.01)
    interest_rate = st.slider("Interest Rate", 0.0, 0.12, float(base.interest_rate), 0.005)
    exit_cap_rate = st.slider("Exit Cap Rate", 0.02, 0.08, float(base.exit_cap_rate), 0.0025)
    holding_period_years = st.slider("Holding Period", 3, 10, int(base.holding_period_years), 1)
    target_irr = st.slider("Target IRR", 0.04, 0.20, 0.10, 0.005)

assumptions = DealAssumptions(
    deal_name=deal_name,
    purchase_price=float(purchase_price),
    leasable_area_sqm=float(leasable_area_sqm),
    occupancy_rate=float(occupancy_rate),
    annual_rent_per_sqm=float(annual_rent_per_sqm),
    annual_opex_per_sqm=float(annual_opex_per_sqm),
    rent_growth=float(rent_growth),
    vacancy_rate=float(vacancy_rate),
    capex_per_sqm=float(capex_per_sqm),
    ltv=float(ltv),
    interest_rate=float(interest_rate),
    exit_cap_rate=float(exit_cap_rate),
    holding_period_years=int(holding_period_years),
)
result = underwrite(assumptions)
source_items = selected_sample.sources if selected_sample else []
asset_profile_items = selected_sample.asset_profile if selected_sample else []

metric_cols = st.columns(5)
metric_cols[0].metric("Levered IRR", f"{result.metrics['levered_irr']:.1%}")
metric_cols[1].metric("Equity Multiple", f"{result.metrics['equity_multiple']:.2f}x")
metric_cols[2].metric("Min DSCR", f"{result.metrics['min_dscr']:.2f}x")
metric_cols[3].metric("Entry Cap", f"{result.metrics['entry_cap_rate']:.1%}")
metric_cols[4].metric("Exit Value", f"{result.metrics['exit_value'] / 100_000_000:,.0f}억원")

tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8 = st.tabs(["Cash Flow", "Debt", "Sensitivity", "Checks", "Institution Lens", "Asset Profile", "Source Tracker", "Memo"])

with tab1:
    st.dataframe(result.operating_cf, use_container_width=True)
    st.dataframe(result.returns, use_container_width=True)

with tab2:
    st.dataframe(result.debt_schedule, use_container_width=True)

with tab3:
    st.dataframe(exit_cap_rent_growth_table(assumptions), use_container_width=True)
    max_price = max_purchase_price_for_target_irr(assumptions, target_irr)
    st.metric("Max Purchase Price For Target IRR", f"{max_price / 100_000_000:,.0f}억원")

with tab4:
    for risk in scan_risks(result):
        if risk["level"] == "High":
            st.error(f"{risk['title']}: {risk['detail']}")
        elif risk["level"] == "Medium":
            st.warning(f"{risk['title']}: {risk['detail']}")
        else:
            st.info(f"{risk['title']}: {risk['detail']}")

with tab5:
    for view in build_institution_views(result):
        st.subheader(view.institution)
        st.caption(view.decision_focus)
        cols = st.columns([1, 2, 2])
        with cols[0]:
            st.markdown("**Key Metrics**")
            for item in view.key_metrics:
                st.write(f"- {item}")
        with cols[1]:
            st.markdown("**Interpretation**")
            for item in view.interpretation:
                st.write(f"- {item}")
        with cols[2]:
            st.markdown("**Diligence Questions**")
            for item in view.diligence_questions:
                st.write(f"- {item}")

with tab6:
    if asset_profile_items:
        st.dataframe(asset_profile_as_rows(asset_profile_items), use_container_width=True)
    else:
        st.info("Load a public research case to see asset location, submarket, tenant context, and source links for the memo.")

with tab7:
    if source_items:
        source_rows = source_items_as_rows(source_items)
        status_counts = {}
        for row in source_rows:
            status_counts[row["Evidence Status"]] = status_counts.get(row["Evidence Status"], 0) + 1
        cols = st.columns(4)
        for col, status in zip(cols, ["Confirmed", "Public reference", "Modeled estimate", "To verify"]):
            col.metric(status, status_counts.get(status, 0))
        st.dataframe(source_rows, use_container_width=True)
        st.info("Public-source cases should be treated as research models. Replace medium/low-confidence assumptions as you extract more precise values from filings, REIT reports, articles, and market reports.")
    else:
        st.info("Load a public research case to see source tracking. For your own deal, track each input as Disclosure, Market Report, News, or Model Assumption.")

with tab8:
    st.markdown(generate_korean_memo(result, asset_profile=asset_profile_items, sources=source_items))

with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
    excel_path = export_excel(result, tmp.name, sources=source_items, asset_profile=asset_profile_items)
    st.download_button(
        "Download Excel Model",
        data=Path(excel_path).read_bytes(),
        file_name="office_underwriting_model.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
