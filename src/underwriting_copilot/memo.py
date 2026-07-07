from __future__ import annotations

from .models import UnderwritingResult
from .institution_lens import build_institution_views
from .risk import scan_risks
from .source_tracker import AssetProfileItem, SourceItem


def krw_billion(value: float) -> str:
    return f"{value / 100_000_000:,.0f}억원"


def percent(value: float) -> str:
    return f"{value:.1%}"


def generate_korean_memo(
    result: UnderwritingResult,
    asset_profile: list[AssetProfileItem] | None = None,
    sources: list[SourceItem] | None = None,
) -> str:
    a = result.assumptions
    m = result.metrics
    top_risks = scan_risks(result)[:3]
    institution_views = build_institution_views(result)
    risk_text = "\n".join([f"- {r['title']}: {r['detail']}" for r in top_risks])
    institution_text = "\n".join(
        [
            f"- {view.institution}: {view.decision_focus}"
            for view in institution_views
        ]
    )
    profile_items = asset_profile or []
    if profile_items:
        profile_text = "\n".join(
            [
                f"- {item.item}: {item.value} ([{item.source_name}]({item.source_url}), {item.evidence_status})"
                for item in profile_items
            ]
        )
        location_thesis = "\n".join(
            [
                f"- {item.memo_use}"
                for item in profile_items
                if item.item in {"District / submarket", "Road / transit context", "Tenant / group context", "Market evidence route"}
            ]
        )
    else:
        profile_text = "- 별도 자산 프로필 입력 없음. 실제 딜 적용 시 주소, 권역, 입지, 임차인, 출처 링크를 추가해야 한다."
        location_thesis = "- 입지 및 임차수요 논리는 공개자료 또는 시장 리포트로 보완해야 한다."

    source_items = sources or []
    source_text = "\n".join(
        [
            f"- {item.field}: {item.value} / {item.evidence_status} / [{item.source_name}]({item.source_url})"
            for item in source_items[:6]
        ]
    ) or "- 별도 Source Tracker 없음."

    return f"""# 투자검토 메모 초안

## 1. 자산 및 입지 개요
{profile_text}

## 2. 입지 및 투자논리
{location_thesis}

## 3. 투자 개요
본 건은 {a.deal_name} 매입 검토 건으로, 매입가는 {krw_billion(a.purchase_price)}, LTV는 {percent(a.ltv)}, 보유기간은 {a.holding_period_years}년으로 가정하였다. 기준 시나리오의 Exit Cap Rate는 {percent(a.exit_cap_rate)}이다.

## 4. 주요 수익성 지표
기준 시나리오에서 자기자본 IRR은 {percent(m['levered_irr'])}, Unlevered IRR은 {percent(m['unlevered_irr'])}, Equity Multiple은 {m['equity_multiple']:.2f}x로 산출되었다. 연평균 Cash-on-Cash Yield는 {percent(m['average_cash_on_cash'])}이다.

## 5. 자본구조 및 부채상환능력
대출금은 {krw_billion(m['loan_amount'])}, 초기 자기자본 투입액은 {krw_billion(m['initial_equity'])}이다. 보유기간 중 최저 DSCR은 {m['min_dscr']:.2f}x이며, Year 1 Debt Yield는 {percent(m['year1_debt_yield'])}로 계산된다.

## 6. 매각가정
매각가치는 매각 다음 연도 NOI {krw_billion(m['next_year_noi'])}를 Exit Cap {percent(a.exit_cap_rate)}로 자본화하여 {krw_billion(m['exit_value'])}로 산출하였다. 수익률이 매각가정에 크게 의존하는지 민감도 표를 통해 추가 확인할 필요가 있다.

## 7. 주요 위험요인 및 추가 확인사항
{risk_text}

## 8. 자료 출처 및 가정 구분
{source_text}

## 9. 기관별 검토 관점
{institution_text}
"""
