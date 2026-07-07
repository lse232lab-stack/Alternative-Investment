# 자산군별 모델 설계 프레임워크

이 프로젝트는 단일 오피스 모델에서 출발했지만, 대체투자에는 오피스, 물류센터, 인프라, 신재생에너지, 데이터센터 등 다양한 자산군이 존재한다. 따라서 좋은 포트폴리오 프로젝트는 "모든 자산을 하나의 수식으로 처리"하기보다, 자산군별 현금흐름 원천과 리스크 드라이버에 맞는 모델을 선택하는 구조를 가져야 한다.

## 1. 왜 자산군 선택이 중요한가

오피스와 인프라는 둘 다 대체투자에 속하지만 모델의 출발점이 다르다.

```text
오피스
- 임대료
- 공실률
- 운영비
- NOI
- Exit Cap
- 임차인 만기 / 입지 / 매각가

인프라 / 신재생
- 발전량 P50/P90
- PPA 계약
- Merchant price
- O&M 비용
- Degradation
- DSCR / LLCR
- 계약 만기 / offtaker credit
```

즉, 자산군을 선택한다는 것은 단순히 화면을 바꾸는 것이 아니라, 어떤 변수가 현금흐름을 만들고 어떤 변수가 리스크를 만드는지 정의하는 일이다.

## 2. 앱의 구조

앱 상단에는 `Model Design Framework`가 있다. 여기서 같은 투자검토라도 자산군별 모델 논리가 어떻게 달라지는지 보여준다.

```text
Cash flow source
Core operating driver
Revenue contract
Valuation approach
Debt metrics
Risk focus
```

사이드바에서 자산군을 선택한다.

```text
Office
Infrastructure - Renewable Power
```

`Office`를 선택하면 기존 오피스 매입 모델이 실행된다.

`Infrastructure - Renewable Power`를 선택하면 Project Orion 기반 인프라 모델이 실행된다.

## 3. Office 모델의 논리

오피스 모델은 임대수입 기반 부동산 모델이다.

```text
임대면적 x 임대료 x 임대율
→ 공실손실 및 운영비 차감
→ NOI
→ Debt Schedule
→ Exit Value = 다음 연도 NOI / Exit Cap
→ IRR, Equity Multiple, DSCR
```

주요 리스크:

```text
공실률
임대료 성장률
Exit Cap
금리
임차인 만기
매각가 의존도
```

## 4. Infrastructure / Renewable 모델의 논리

인프라 모델은 프로젝트 현금흐름 모델이다. Project Orion 자료를 기반으로 풍력발전 프로젝트의 경제성을 단순화해 구현했다.

```text
발전량 P50/P90
→ PPA 계약 물량 및 가격
→ Merchant 판매 물량 및 가격
→ O&M 비용
→ EBITDA
→ Debt Service
→ DSCR
→ Equity Cash Flow
→ IRR, Equity Multiple
```

주요 리스크:

```text
P50/P90 발전량 차이
연간 degradation
PPA 계약 만기
offtaker credit
merchant price
O&M 비용
DSCR
```

## 5. 면접에서 활용하는 방식

면접에서는 이렇게 말하면 좋다.

```text
처음에는 오피스 매입 모델에서 출발했지만, 대체투자는 자산군별로 현금흐름의 원천과 리스크 드라이버가 다르다고 판단했습니다. 그래서 앱에 자산군 선택 단계를 추가했고, 오피스는 임대료·공실률·Exit Cap 중심으로, 인프라는 발전량·PPA·merchant price·DSCR 중심으로 모델이 전개되도록 분리했습니다.
```

SRT-RE 지원용으로는 다음처럼 연결할 수 있다.

```text
회계법인 부동산/대체투자 자문에서는 단순히 하나의 IRR 모델을 만드는 것보다, 자산군별 사업 구조를 이해하고 그에 맞는 가정을 선택하는 능력이 중요하다고 생각했습니다. 이에 오피스와 인프라 케이스를 구분해, 각 자산군의 핵심 현금흐름 원천과 리스크를 별도 모델로 설계했습니다.
```

주의할 점:

```text
Project Orion은 교육용 IM 기반 케이스이므로 실제 딜이라고 표현하면 안 된다.
오피스 케이스는 공개자료 기반 리서치 케이스이고, 인프라 케이스는 교육용 IM 기반 모델링 케이스라고 구분한다.
```

