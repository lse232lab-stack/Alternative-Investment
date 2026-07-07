from __future__ import annotations

from dataclasses import dataclass

from .models import UnderwritingResult


@dataclass(frozen=True)
class InstitutionView:
    institution: str
    decision_focus: str
    key_metrics: list[str]
    interpretation: list[str]
    diligence_questions: list[str]


def _pct(value: float) -> str:
    return f"{value:.1%}"


def _multiple(value: float) -> str:
    return f"{value:.2f}x"


def build_institution_views(result: UnderwritingResult) -> list[InstitutionView]:
    a = result.assumptions
    m = result.metrics
    debt_exit_gap = a.exit_cap_rate - m["entry_cap_rate"]

    pf_interpretation = [
        f"LTV {_pct(a.ltv)} and minimum DSCR {_multiple(m['min_dscr'])} indicate whether senior debt sizing is supportable under base-case NOI.",
        f"Year 1 Debt Yield is {_pct(m['year1_debt_yield'])}; this is a lender-oriented downside metric because it ignores sponsor IRR and focuses on collateral income.",
        "Interest-only debt improves early equity cash flow but leaves refinancing and sale execution risk concentrated in the exit year.",
    ]
    if m["min_dscr"] < 1.30:
        pf_interpretation.append("DSCR cushion is not wide, so the financing case should test higher interest rates and lower NOI.")
    if a.ltv > 0.60:
        pf_interpretation.append("Leverage is meaningful; loan sizing should be cross-checked against lender LTV and debt yield constraints.")

    manager_interpretation = [
        f"Levered IRR {_pct(m['levered_irr'])} and Equity Multiple {_multiple(m['equity_multiple'])} show sponsor return, but sale proceeds represent {_pct(m['sale_profit_share'])} of positive equity cash flow.",
        f"Entry Cap is {_pct(m['entry_cap_rate'])} vs Exit Cap {_pct(a.exit_cap_rate)}; the model should explain whether value creation comes from NOI growth, cap-rate movement, or leverage.",
        "The sensitivity table is central for an investment committee because small changes in exit cap and rent growth can change the investment conclusion.",
    ]
    if m["sale_profit_share"] > 0.65:
        manager_interpretation.append("The deal is exit-value dependent, so underwriting should emphasize leasing durability and buyer liquidity at exit.")
    if debt_exit_gap < -0.005:
        manager_interpretation.append("Exit cap compression is embedded in the case; this should be defended with market evidence or treated as upside only.")

    insurer_interpretation = [
        f"Minimum DSCR {_multiple(m['min_dscr'])}, Debt Yield {_pct(m['year1_debt_yield'])}, and stable NOI matter more than headline IRR for an insurance balance-sheet investor.",
        f"Average Cash-on-Cash Yield is {_pct(m['average_cash_on_cash'])}; this indicates recurring distributable income before relying on terminal sale value.",
        "An insurer-style review should focus on downside resilience, duration match, predictable income, and capital preservation.",
    ]
    if m["average_cash_on_cash"] < 0.04:
        insurer_interpretation.append("Current income is modest, so the case may be less compelling for an income-oriented balance-sheet investor.")
    if m["sale_profit_share"] > 0.65:
        insurer_interpretation.append("High terminal-value contribution weakens the income-stability story and should be treated conservatively.")

    return [
        InstitutionView(
            institution="증권사 PF / 대출 심사 관점",
            decision_focus="담보가치와 현금흐름이 대출 원리금과 Exit 리스크를 충분히 커버하는지 판단한다.",
            key_metrics=[
                f"LTV: {_pct(a.ltv)}",
                f"Minimum DSCR: {_multiple(m['min_dscr'])}",
                f"Year 1 Debt Yield: {_pct(m['year1_debt_yield'])}",
                f"Interest Rate: {_pct(a.interest_rate)}",
            ],
            interpretation=pf_interpretation,
            diligence_questions=[
                "금리가 50~100bp 상승해도 DSCR 1.20x를 유지하는가?",
                "Exit 시 대출잔액 상환이 매각가에 과도하게 의존하지 않는가?",
                "감정가와 매입가, 대출가능금액 사이에 충분한 담보 여력이 있는가?",
            ],
        ),
        InstitutionView(
            institution="대체투자운용사 / 투자심의 관점",
            decision_focus="목표수익률을 충족하는 동시에 수익의 원천과 하방 리스크가 투자논리로 설명되는지 판단한다.",
            key_metrics=[
                f"Levered IRR: {_pct(m['levered_irr'])}",
                f"Unlevered IRR: {_pct(m['unlevered_irr'])}",
                f"Equity Multiple: {_multiple(m['equity_multiple'])}",
                f"Sale-Profit Share: {_pct(m['sale_profit_share'])}",
            ],
            interpretation=manager_interpretation,
            diligence_questions=[
                "IRR이 임대수입, NOI 성장, 레버리지, Exit Cap 중 무엇에 가장 민감한가?",
                "목표 IRR을 맞추기 위한 최대 매입가가 현재 매입가보다 충분히 높은가?",
                "Exit Cap, 공실률, 임대료 성장률 가정이 시장자료로 방어 가능한가?",
            ],
        ),
        InstitutionView(
            institution="보험사 자산운용 / 장기 ALM 관점",
            decision_focus="높은 수익률보다 안정적인 배당, 원금보전, 장기 현금흐름의 예측가능성을 중점적으로 본다.",
            key_metrics=[
                f"Average Cash-on-Cash: {_pct(m['average_cash_on_cash'])}",
                f"Minimum DSCR: {_multiple(m['min_dscr'])}",
                f"Entry Cap: {_pct(m['entry_cap_rate'])}",
                f"Exit Cap: {_pct(a.exit_cap_rate)}",
            ],
            interpretation=insurer_interpretation,
            diligence_questions=[
                "보유기간 중 배당 가능 현금흐름이 안정적으로 유지되는가?",
                "Exit Value 없이도 투자 논리가 성립하는가?",
                "금리, 공실, 임차인 만기 집중 리스크가 장기 자산운용 관점에서 감내 가능한가?",
            ],
        ),
    ]


def institution_views_as_rows(result: UnderwritingResult) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for view in build_institution_views(result):
        rows.append(
            {
                "Institution": view.institution,
                "Decision Focus": view.decision_focus,
                "Key Metrics": "\n".join(view.key_metrics),
                "Interpretation": "\n".join(view.interpretation),
                "Diligence Questions": "\n".join(view.diligence_questions),
            }
        )
    return rows

