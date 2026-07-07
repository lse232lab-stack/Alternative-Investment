from pathlib import Path
import sys
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

from underwriting_copilot.detailed_models import (
    DataCenterAssumptions,
    LBOAssumptions,
    LogisticsAssumptions,
    PrivateCreditAssumptions,
    underwrite_data_center,
    underwrite_lbo,
    underwrite_logistics,
    underwrite_private_credit,
)


class DetailedModelsTest(unittest.TestCase):
    def assert_result_is_modelable(self, result, years=5):
        self.assertEqual(len(result.cash_flow), years)
        self.assertEqual(len(result.equity_cash_flows), years + 1)
        self.assertIn("levered_irr", result.metrics)
        self.assertIn("equity_multiple", result.metrics)
        self.assertIn("npv", result.metrics)

    def test_logistics_model(self):
        result = underwrite_logistics(LogisticsAssumptions())
        self.assert_result_is_modelable(result)
        self.assertGreater(result.metrics["min_dscr"], 0.0)
        self.assertGreater(result.metrics["entry_cap_rate"], 0.0)

    def test_data_center_model(self):
        result = underwrite_data_center(DataCenterAssumptions())
        self.assert_result_is_modelable(result)
        self.assertGreater(result.metrics["year1_ebitda_margin"], 0.0)
        self.assertGreater(result.metrics["exit_enterprise_value"], 0.0)

    def test_private_credit_model(self):
        result = underwrite_private_credit(PrivateCreditAssumptions())
        self.assert_result_is_modelable(result)
        self.assertGreater(result.metrics["gross_coupon"], result.metrics["expected_loss_rate"])

    def test_lbo_model(self):
        result = underwrite_lbo(LBOAssumptions())
        self.assert_result_is_modelable(result)
        self.assertGreater(result.metrics["entry_enterprise_value"], result.metrics["entry_equity"])
        self.assertGreater(result.metrics["exit_equity_value"], 0.0)


if __name__ == "__main__":
    unittest.main()
