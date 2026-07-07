from __future__ import annotations

from pathlib import Path
import math

import pandas as pd

from .institution_lens import institution_views_as_rows
from .models import UnderwritingResult
from .risk import scan_risks
from .sensitivity import exit_cap_rent_growth_table
from .source_tracker import SourceItem, source_items_as_rows
from .source_tracker import AssetProfileItem, asset_profile_as_rows


def _safe_number(value: float) -> float | str:
    if isinstance(value, (int, float)) and not math.isfinite(value):
        return "N/A"
    return value


def export_excel(
    result: UnderwritingResult,
    output_path: str | Path,
    sources: list[SourceItem] | None = None,
    asset_profile: list[AssetProfileItem] | None = None,
) -> Path:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    assumptions = result.assumptions
    years = assumptions.holding_period_years
    sensitivity = exit_cap_rent_growth_table(assumptions)
    risks = pd.DataFrame(scan_risks(result))
    institution_lens = pd.DataFrame(institution_views_as_rows(result))
    source_tracker = pd.DataFrame(source_items_as_rows(sources or []))
    profile_tracker = pd.DataFrame(asset_profile_as_rows(asset_profile or []))

    with pd.ExcelWriter(output_path, engine="xlsxwriter") as writer:
        workbook = writer.book
        money_fmt = workbook.add_format({"num_format": "#,##0", "border": 1})
        pct_fmt = workbook.add_format({"num_format": "0.0%", "border": 1})
        mult_fmt = workbook.add_format({"num_format": "0.00x", "border": 1})
        header_fmt = workbook.add_format({"bold": True, "bg_color": "#D9EAF7", "border": 1})
        input_fmt = workbook.add_format({"bg_color": "#FFF2CC", "border": 1})
        title_fmt = workbook.add_format({"bold": True, "font_size": 14})

        cover = workbook.add_worksheet("01_Cover")
        writer.sheets["01_Cover"] = cover
        cover.write("A1", assumptions.deal_name, title_fmt)
        cover.write("A3", "Metric", header_fmt)
        cover.write("B3", "Value", header_fmt)
        cover_metrics = [
            ("Purchase Price", result.metrics["purchase_price"], money_fmt),
            ("Initial Equity", result.metrics["initial_equity"], money_fmt),
            ("Levered IRR", result.metrics["levered_irr"], pct_fmt),
            ("Unlevered IRR", result.metrics["unlevered_irr"], pct_fmt),
            ("Equity Multiple", result.metrics["equity_multiple"], mult_fmt),
            ("Min DSCR", result.metrics["min_dscr"], mult_fmt),
            ("Exit Value", result.metrics["exit_value"], money_fmt),
        ]
        for row, (label, value, fmt) in enumerate(cover_metrics, start=3):
            cover.write(row, 0, label)
            cover.write(row, 1, _safe_number(value), fmt)
        cover.set_column("A:A", 24)
        cover.set_column("B:B", 18)

        assump_ws = workbook.add_worksheet("02_Assumptions")
        writer.sheets["02_Assumptions"] = assump_ws
        assumptions_rows = [
            ("Purchase Price", assumptions.purchase_price, money_fmt),
            ("Leasable Area SQM", assumptions.leasable_area_sqm, money_fmt),
            ("Occupancy Rate", assumptions.occupancy_rate, pct_fmt),
            ("Annual Rent Per SQM", assumptions.annual_rent_per_sqm, money_fmt),
            ("Annual Opex Per SQM", assumptions.annual_opex_per_sqm, money_fmt),
            ("Rent Growth", assumptions.rent_growth, pct_fmt),
            ("Vacancy Rate", assumptions.vacancy_rate, pct_fmt),
            ("CAPEX Per SQM", assumptions.capex_per_sqm, money_fmt),
            ("Asset Management Fee Rate", assumptions.asset_management_fee_rate, pct_fmt),
            ("Acquisition Cost Rate", assumptions.acquisition_cost_rate, pct_fmt),
            ("LTV", assumptions.ltv, pct_fmt),
            ("Interest Rate", assumptions.interest_rate, pct_fmt),
            ("Loan Fee Rate", assumptions.loan_fee_rate, pct_fmt),
            ("Holding Period", assumptions.holding_period_years, money_fmt),
            ("Exit Cap Rate", assumptions.exit_cap_rate, pct_fmt),
            ("Selling Cost Rate", assumptions.selling_cost_rate, pct_fmt),
            ("Discount Rate", assumptions.discount_rate, pct_fmt),
        ]
        assump_ws.write("A1", "Input", header_fmt)
        assump_ws.write("B1", "Value", header_fmt)
        for row, (label, value, fmt) in enumerate(assumptions_rows, start=1):
            assump_ws.write(row, 0, label)
            assump_ws.write(row, 1, value, input_fmt if fmt is money_fmt else fmt)
        assump_ws.set_column("A:A", 30)
        assump_ws.set_column("B:B", 18)

        result.sources_uses.to_excel(writer, sheet_name="03_Sources_Uses", index=False)
        result.operating_cf.to_excel(writer, sheet_name="04_Operating_CF", index=False)
        result.debt_schedule.to_excel(writer, sheet_name="05_Debt", index=False)
        result.returns.to_excel(writer, sheet_name="06_Returns", index=False)
        sensitivity.to_excel(writer, sheet_name="07_Sensitivity", index=False)
        risks.to_excel(writer, sheet_name="08_Checks", index=False)
        institution_lens.to_excel(writer, sheet_name="09_Institution_Lens", index=False)
        if not profile_tracker.empty:
            profile_tracker.to_excel(writer, sheet_name="10_Asset_Profile", index=False)
        if not source_tracker.empty:
            source_tracker.to_excel(writer, sheet_name="11_Source_Tracker", index=False)

        sheet_names = ["03_Sources_Uses", "04_Operating_CF", "05_Debt", "06_Returns", "07_Sensitivity", "08_Checks", "09_Institution_Lens"]
        if not profile_tracker.empty:
            sheet_names.append("10_Asset_Profile")
        if not source_tracker.empty:
            sheet_names.append("11_Source_Tracker")
        for sheet_name in sheet_names:
            ws = writer.sheets[sheet_name]
            ws.set_row(0, None, header_fmt)
            ws.set_column("A:K", 18)

        returns_ws = writer.sheets["06_Returns"]
        metric_start = years + 4
        returns_ws.write(0, 7, "Year", header_fmt)
        returns_ws.write(0, 8, "Excel Levered CF", header_fmt)
        returns_ws.write(1, 7, 0)
        returns_ws.write(1, 8, -abs(result.equity_cash_flows[0]), money_fmt)
        for idx in range(years):
            returns_ws.write(idx + 2, 7, idx + 1)
            returns_ws.write_formula(idx + 2, 8, f"=D{idx + 2}", money_fmt, result.equity_cash_flows[idx + 1])
        returns_ws.write(metric_start, 0, "Excel Formula Checks", header_fmt)
        returns_ws.write(metric_start + 1, 0, "Levered IRR")
        returns_ws.write_formula(metric_start + 1, 1, f"=IRR(I2:I{years + 2})", pct_fmt, result.metrics["levered_irr"])
        returns_ws.write(metric_start + 2, 0, "Equity Multiple")
        returns_ws.write_formula(metric_start + 2, 1, f"=SUM(I3:I{years + 2})/ABS(I2)", mult_fmt, result.metrics["equity_multiple"])

    return output_path
