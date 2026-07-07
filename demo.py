from __future__ import annotations

from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent / "src"))

from underwriting_copilot import DealAssumptions, underwrite
from underwriting_copilot.excel_export import export_excel
from underwriting_copilot.memo import generate_korean_memo
from underwriting_copilot.risk import scan_risks
from underwriting_copilot.sample_deals import sample_deals
from underwriting_copilot.sensitivity import max_purchase_price_for_target_irr


def main() -> None:
    assumptions = DealAssumptions()
    result = underwrite(assumptions)
    output_path = export_excel(result, Path("outputs") / "sample_office_underwriting.xlsx")
    public_case = sample_deals()["SK Seorin Building public research case"]
    public_result = underwrite(public_case.assumptions)
    public_output_path = export_excel(
        public_result,
        Path("outputs") / "sk_seorin_public_research_case.xlsx",
        sources=public_case.sources,
        asset_profile=public_case.asset_profile,
    )
    max_price = max_purchase_price_for_target_irr(assumptions, 0.10)

    print("Office Deal Underwriting Copilot Demo")
    print(f"Levered IRR: {result.metrics['levered_irr']:.2%}")
    print(f"Equity Multiple: {result.metrics['equity_multiple']:.2f}x")
    print(f"Min DSCR: {result.metrics['min_dscr']:.2f}x")
    print(f"Max purchase price for 10.0% IRR: KRW {max_price:,.0f}")
    print(f"Excel exported: {output_path}")
    print(f"Public research case exported: {public_output_path}")
    print("\nRisk checks:")
    for risk in scan_risks(result):
        print(f"- [{risk['level']}] {risk['title']}: {risk['detail']}")
    print("\n" + generate_korean_memo(result))


if __name__ == "__main__":
    main()
