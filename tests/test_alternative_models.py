from pathlib import Path
import sys
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from underwriting_copilot.alternative_models import (
    alternative_asset_catalog,
    default_generic_assumptions,
    underwrite_generic,
)


class AlternativeModelsTest(unittest.TestCase):
    def test_catalog_includes_major_alternative_asset_groups(self):
        groups = {item.group for item in alternative_asset_catalog()}
        self.assertIn("Real Estate", groups)
        self.assertIn("Infrastructure", groups)
        self.assertIn("Private Debt", groups)
        self.assertIn("Private Equity", groups)
        self.assertIn("Private Funds", groups)

    def test_generic_models_produce_cash_flows_for_each_template_asset(self):
        for template in alternative_asset_catalog():
            if template.asset_class in {"Office", "Renewable Power"}:
                continue
            assumptions = default_generic_assumptions(template.asset_class)
            result = underwrite_generic(assumptions)
            self.assertEqual(len(result.cash_flow), assumptions.holding_period_years)
            self.assertEqual(len(result.equity_cash_flows), assumptions.holding_period_years + 1)
            self.assertIn("levered_irr", result.metrics)
            self.assertIn("equity_multiple", result.metrics)
            self.assertTrue(result.memo.startswith(f"# {template.asset_class} Underwriting Memo Draft"))


if __name__ == "__main__":
    unittest.main()
