from __future__ import annotations

from pathlib import Path
import sys
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from underwriting_copilot import DealAssumptions, underwrite
from underwriting_copilot.infra_models import InfraAssumptions, underwrite_infra
from underwriting_copilot.sample_deals import sample_deals
from underwriting_copilot.sensitivity import max_purchase_price_for_target_irr


class UnderwritingEngineTest(unittest.TestCase):
    def test_base_case_metrics_are_reasonable(self) -> None:
        result = underwrite(DealAssumptions())

        self.assertGreater(result.metrics["levered_irr"], 0.0)
        self.assertGreater(result.metrics["equity_multiple"], 1.0)
        self.assertGreater(result.metrics["min_dscr"], 1.0)
        self.assertAlmostEqual(result.metrics["sources_uses_check"], 0.0, delta=1.0)
        self.assertEqual(len(result.equity_cash_flows), 6)

    def test_reverse_underwriting_reaches_target(self) -> None:
        assumptions = DealAssumptions()
        max_price = max_purchase_price_for_target_irr(assumptions, 0.10)
        result = underwrite(DealAssumptions(purchase_price=max_price))

        self.assertAlmostEqual(result.metrics["levered_irr"], 0.10, delta=0.002)

    def test_invalid_ltv_raises(self) -> None:
        with self.assertRaises(ValueError):
            underwrite(DealAssumptions(ltv=1.10))

    def test_public_research_case_is_modelable(self) -> None:
        deal = sample_deals()["SK Seorin Building public research case"]
        result = underwrite(deal.assumptions)

        self.assertGreater(result.metrics["min_dscr"], 1.0)
        self.assertGreater(result.metrics["equity_multiple"], 1.0)
        self.assertGreater(len(deal.sources), 0)

    def test_infra_case_is_modelable(self) -> None:
        result = underwrite_infra(InfraAssumptions())

        self.assertGreater(len(result.project_cf), 0)
        self.assertGreater(result.metrics["year1_contracted_revenue_pct"], 0.5)
        self.assertGreater(result.metrics["min_dscr"], 0.0)


if __name__ == "__main__":
    unittest.main()
