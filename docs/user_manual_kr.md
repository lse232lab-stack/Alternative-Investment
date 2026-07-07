# Alternative Investment Underwriting Copilot 사용자 설명서

이 문서는 `Alternative Investment Underwriting Copilot`을 처음 보는 사람이 프로그램의 목적, 용어, 사용 순서, 결과 해석 방법, 취업 준비 활용법을 차근차근 이해할 수 있도록 만든 설명서다.

## 1. 이 프로그램은 무엇인가

이 프로그램은 대체투자 자산의 투자검토 과정을 간단한 앱으로 구현한 포트폴리오 프로젝트다.

핵심 목적은 다음이다.

```text
자산군 선택
→ 해당 자산군에 맞는 재무모델 적용
→ 현금흐름 계산
→ 대출 및 수익률 분석
→ 민감도와 리스크 점검
→ 출처와 가정 구분
→ 투자검토 메모 작성
```

중요한 점은 AI가 숫자를 계산하지 않는다는 것이다. NOI, IRR, DSCR, PPA Revenue 등 핵심 계산은 Python 함수로 고정되어 있고, AI는 향후 자연어 입력 정리나 메모 작성 보조에만 사용할 수 있도록 설계되어 있다.

## 2. 왜 만들었는가

취업 준비용 프로젝트에서 단순히 "AI로 재무모델을 만들었다"고 말하면 설득력이 약하다. 회계법인 부동산본부, 증권사 PF, 대체투자운용사, 보험사 자산운용 직무에서는 다음 역량이 더 중요하다.

```text
어떤 자산군인지 구분하는 능력
자산군별 현금흐름 원천을 이해하는 능력
각 가정의 출처와 신뢰도를 관리하는 능력
수익률이 어떤 변수에 민감한지 설명하는 능력
계산 결과를 투자검토 메모로 정리하는 능력
```

이 프로젝트는 위 과정을 하나의 앱으로 보여주기 위해 만들었다.

## 3. 현재 지원하는 자산군

현재 앱은 두 가지 자산군을 지원한다.

```text
1. Office
2. Infrastructure - Renewable Power
```

### 3.1 Office

오피스 매입 딜을 분석하는 모델이다.

주요 질문:

```text
이 오피스의 임대수입은 안정적인가?
NOI는 어느 정도인가?
대출을 감당할 수 있는가?
Exit Cap이 변하면 IRR이 얼마나 흔들리는가?
목표 IRR을 맞추려면 얼마까지 매입해도 되는가?
```

### 3.2 Infrastructure - Renewable Power

풍력발전 프로젝트 같은 신재생 인프라 자산을 분석하는 모델이다.

주요 질문:

```text
발전량은 어느 정도인가?
수익 중 얼마가 PPA로 계약되어 있는가?
Merchant price 변동에 얼마나 노출되어 있는가?
Debt Service를 감당할 수 있는가?
P50/P90 발전량 변화에 따라 DSCR과 IRR이 어떻게 달라지는가?
```

## 4. 기본 사용 순서

앱 주소:

```text
http://localhost:8501
```

사용 순서:

```text
1. 왼쪽 사이드바에서 Asset Class 선택
2. Model Design Framework 확인
3. 선택한 자산군의 입력값 확인 또는 수정
4. 핵심 지표 확인
5. 현금흐름 표 확인
6. Debt Schedule 확인
7. Sensitivity 또는 Risk 항목 확인
8. Source Tracker와 Asset Profile 확인
9. Memo 탭에서 투자검토 메모 초안 확인
10. Excel 다운로드
```

## 5. 화면 구성

### 5.1 Asset Class

자산군을 선택하는 영역이다.

```text
Office
Infrastructure - Renewable Power
```

이 선택에 따라 입력값, 계산 로직, 결과 탭이 달라진다.

### 5.2 Model Design Framework

자산군별 모델 설계 차이를 보여주는 표다.

주요 항목:

```text
Cash flow source
Core operating driver
Revenue contract
Valuation approach
Debt metrics
Risk focus
```

이 표는 면접에서 특히 중요하다. "왜 오피스와 인프라를 같은 방식으로 모델링하지 않았는지"를 보여주기 때문이다.

### 5.3 Deal Assumptions

딜의 주요 입력값을 넣는 영역이다. 오피스 모델에서는 매입가, 임대면적, 임대료, 공실률, LTV, 금리, Exit Cap 등을 입력한다.

### 5.4 Research Case

오피스 모델에서는 샘플 딜을 선택할 수 있다.

```text
Base hypothetical office deal
SK Seorin Building public research case
```

`SK Seorin Building public research case`는 공개자료 기반 리서치 케이스다. 모든 숫자가 실제 확정값이라는 뜻은 아니며, Source Tracker에서 확인값과 추정치를 구분한다.

## 6. 주요 용어 설명

### 6.1 대체투자

주식과 채권 같은 전통자산이 아닌 투자자산을 말한다.

예시:

```text
부동산
인프라
신재생에너지
물류센터
데이터센터
사모펀드
사모대출
```

### 6.2 Underwriting

투자 여부를 판단하기 위해 가정, 현금흐름, 리스크, 수익률을 검토하는 과정이다.

이 프로젝트에서 underwriting은 다음을 의미한다.

```text
입력 가정 설정
현금흐름 계산
대출상환능력 분석
수익률 계산
민감도 분석
리스크 점검
메모 작성
```

### 6.3 NOI

`Net Operating Income`의 약자다. 부동산이 운영을 통해 벌어들이는 순영업소득이다.

간단히 말하면:

```text
NOI = 임대수입 - 공실손실 - 운영비
```

NOI는 부동산 자체의 수익력을 보는 핵심 지표다. 대출 이자나 세금, 매각가는 반영하지 않는다.

### 6.4 Exit Cap Rate

매각 시점의 Cap Rate다. 오피스 매각가를 계산할 때 사용한다.

```text
Exit Value = 매각 다음 연도 NOI / Exit Cap Rate
```

Exit Cap이 낮아지면 매각가가 올라가고, Exit Cap이 높아지면 매각가가 내려간다.

### 6.5 IRR

`Internal Rate of Return`의 약자다. 투자자가 투입한 현금과 회수한 현금의 시간가치를 반영한 수익률이다.

이 프로젝트에서는 두 가지 IRR을 본다.

```text
Levered IRR: 대출을 반영한 자기자본 기준 IRR
Unlevered IRR: 대출을 제외한 자산 자체 기준 IRR
```

### 6.6 Equity Multiple

투입한 자기자본 대비 총 회수금액이 몇 배인지 보여주는 지표다.

```text
Equity Multiple = 총 자기자본 회수액 / 초기 자기자본 투입액
```

예를 들어 1.5x라면 100억원 투자해 150억원을 회수했다는 뜻이다.

### 6.7 DSCR

`Debt Service Coverage Ratio`의 약자다. 대출 원리금상환액을 영업현금흐름이 얼마나 커버하는지 보는 지표다.

부동산 모델:

```text
DSCR = NOI / Debt Service
```

인프라 모델:

```text
DSCR = EBITDA / Debt Service
```

DSCR이 1.0x보다 낮으면 현금흐름만으로 대출상환을 감당하기 어렵다는 뜻이다.

### 6.8 Debt Yield

대출잔액 대비 NOI가 얼마나 되는지 보는 대주 관점 지표다.

```text
Debt Yield = NOI / 대출잔액
```

LTV가 자산가치 기준이라면, Debt Yield는 현금흐름 기준의 대출 안정성 지표다.

### 6.9 PPA

`Power Purchase Agreement`의 약자다. 발전사업자가 전력을 구매자에게 일정 가격과 기간으로 판매하기로 한 계약이다.

인프라/신재생 프로젝트에서는 PPA가 안정적인 현금흐름의 근거가 된다.

### 6.10 Merchant Revenue

PPA로 고정 판매하지 않고 시장가격에 따라 전력을 판매해 얻는 수익이다.

장점:

```text
시장가격 상승 시 수익 증가 가능
```

리스크:

```text
시장가격 하락 시 수익 감소
```

### 6.11 P50 / P90

발전량 추정 시나리오다.

```text
P50: 평균적인 발전량 케이스
P90: 더 보수적인 발전량 케이스
```

P90은 90% 확률로 이 수준 이상의 발전량이 나온다는 의미로 쓰이며, 대출 검토에서 더 보수적인 기준으로 활용된다.

### 6.12 Degradation

발전설비의 성능이 시간이 지나며 조금씩 낮아지는 현상이다.

예:

```text
Annual Degradation 0.3%
```

매년 발전량이 0.3%씩 감소한다고 보는 가정이다.

### 6.13 O&M

`Operations and Maintenance`의 약자다. 운영 및 유지보수 비용을 의미한다.

인프라 자산에서는 O&M 비용이 EBITDA와 DSCR에 직접 영향을 준다.

### 6.14 EBITDA

이자, 세금, 감가상각 전 이익이다.

인프라 모델에서는 프로젝트가 대출상환 전에 만들어내는 현금흐름에 가까운 지표로 사용한다.

## 7. Office 모델 사용법

### 7.1 입력값

Office를 선택하면 다음 입력값을 볼 수 있다.

```text
Deal Name
Purchase Price
Leasable Area
Occupancy Rate
Annual Rent / sqm
Annual Opex / sqm
Rent Growth
Vacancy Rate
CAPEX / sqm
LTV
Interest Rate
Exit Cap Rate
Holding Period
Target IRR
```

### 7.2 결과 지표

상단에는 다섯 가지 핵심 지표가 나온다.

```text
Levered IRR
Equity Multiple
Min DSCR
Entry Cap
Exit Value
```

### 7.3 Cash Flow 탭

오피스의 운영현금흐름과 자기자본 현금흐름을 보여준다.

확인할 것:

```text
NOI가 매년 증가하는가?
CAPEX와 운용보수를 뺀 후 현금흐름이 충분한가?
마지막 해 매각대금이 전체 수익에서 너무 큰 비중을 차지하지 않는가?
```

### 7.4 Debt 탭

대출잔액, 이자, 원금, DSCR, Debt Yield를 보여준다.

확인할 것:

```text
Min DSCR이 1.2x 이상인가?
대출잔액이 비정상적으로 음수가 되지 않는가?
금리 상승 시에도 상환능력이 유지되는가?
```

### 7.5 Sensitivity 탭

Exit Cap과 임대료 성장률 변화에 따른 IRR을 보여준다.

이 탭의 의미:

```text
기준 시나리오만 보는 것이 아니라,
나쁜 시나리오에서 수익률이 얼마나 훼손되는지 확인한다.
```

### 7.6 Checks 탭

모델이 자동으로 리스크를 점검한다.

예시:

```text
DSCR 미달
LTV 과다
공실률 과소
임대료 성장률 과대
Exit Cap 과도
매각가 의존도 과다
```

### 7.7 Asset Profile 탭

자산의 위치, 권역, 입지 논리, 임차인 맥락, 출처 링크를 보여준다.

이 탭은 투자검토 메모에 들어갈 비재무 정보를 관리한다.

### 7.8 Source Tracker 탭

각 입력값이 어디서 왔는지 보여준다.

구분:

```text
Confirmed: 공시나 보고서에서 직접 확인한 값
Public reference: 공개자료가 방향성을 뒷받침하는 값
Modeled estimate: 모델링 목적상 둔 추정치
To verify: 추가 확인이 필요한 값
```

이 탭은 면접에서 매우 중요하다. 모든 숫자를 실제값이라고 주장하지 않고, 확인값과 추정치를 구분했다는 점을 보여준다.

### 7.9 Memo 탭

투자검토 메모 초안을 보여준다.

구성:

```text
자산 및 입지 개요
입지 및 투자논리
투자 개요
주요 수익성 지표
자본구조 및 부채상환능력
매각가정
주요 위험요인
자료 출처 및 가정 구분
기관별 검토 관점
```

## 8. Infrastructure 모델 사용법

### 8.1 입력값

Infrastructure - Renewable Power를 선택하면 다음 입력값을 볼 수 있다.

```text
Project Name
Location
Capacity MW AC
Production Scenario
P50 MWh
P90 MWh
Annual Degradation
Acquisition Price
Debt %
Debt Interest Rate
Merchant Price
Holding Period
```

### 8.2 결과 지표

상단에는 다음 지표가 나온다.

```text
Levered IRR
Equity Multiple
Min DSCR
Contracted Revenue
Terminal Value
```

### 8.3 Project CF 탭

프로젝트의 발전량, PPA 수익, Merchant 수익, O&M 비용, EBITDA를 보여준다.

확인할 것:

```text
발전량이 degradation 때문에 매년 감소하는가?
PPA 수익과 Merchant 수익 비중은 어떤가?
EBITDA가 Debt Service를 감당할 수 있는가?
```

### 8.4 Debt 탭

대출잔액, 이자, 원금상환, DSCR을 보여준다.

확인할 것:

```text
Min DSCR이 1.0x 이상인가?
대출상환이 특정 연도에 과도하게 집중되지 않는가?
P90으로 바꿨을 때 DSCR이 얼마나 떨어지는가?
```

### 8.5 Returns 탭

투자자 관점의 Equity Cash Flow를 보여준다.

확인할 것:

```text
초기 투자금 대비 현금회수가 충분한가?
Terminal Value에 지나치게 의존하지 않는가?
PPA 기간과 보유기간이 잘 맞는가?
```

### 8.6 Memo 탭

인프라 투자검토 메모 초안을 보여준다.

구성:

```text
Project Overview
Contracted Revenue
Key Metrics
Main Diligence Focus
```

## 9. Excel 다운로드

Office 모델에서는 Excel 다운로드 기능을 제공한다.

다운로드 파일에는 다음 시트가 포함된다.

```text
01_Cover
02_Assumptions
03_Sources_Uses
04_Operating_CF
05_Debt
06_Returns
07_Sensitivity
08_Checks
09_Institution_Lens
10_Asset_Profile
11_Source_Tracker
```

Excel에는 Python 계산 결과뿐 아니라 일부 검산용 수식도 들어 있다. 이 구조는 "앱 화면과 Excel 산출물이 같은 계산 논리를 따른다"는 점을 보여준다.

## 10. 해석할 때 주의할 점

### 10.1 IRR만 보면 안 된다

IRR이 높아도 다음 경우에는 위험할 수 있다.

```text
매각가정에 과도하게 의존
Exit Cap을 너무 낮게 가정
공실률을 너무 낮게 가정
Merchant price를 너무 높게 가정
Debt Service를 감당하지 못함
```

### 10.2 추정치를 숨기면 안 된다

공개자료 기반 프로젝트에서는 모든 값을 확인할 수 없다. 그래서 추정치를 숨기는 것보다 명확히 표시하는 것이 더 실무적이다.

### 10.3 자산군마다 핵심 질문이 다르다

오피스의 핵심 질문:

```text
입지와 임차수요가 NOI를 방어하는가?
Exit Cap 변화에 수익률이 얼마나 민감한가?
```

인프라의 핵심 질문:

```text
계약 현금흐름이 안정적인가?
P90과 Merchant downside에서도 DSCR이 버티는가?
```

## 11. 취업 준비에서 활용하는 방법

### 11.1 자기소개서 문장

```text
대체투자 업무에서 자산군별 현금흐름 구조와 리스크 드라이버가 다르다는 점에 착안해, 오피스와 인프라 자산을 구분해 분석하는 Underwriting Copilot을 구축했습니다. 오피스 모델은 임대료, 공실률, NOI, Exit Cap을 중심으로, 인프라 모델은 발전량, PPA 계약, merchant exposure, DSCR을 중심으로 설계했습니다. 또한 공개자료 기반 확인값과 모델링 추정치를 분리하고, 각 입력값의 출처와 신뢰도를 관리해 재무모델의 설명 가능성을 높였습니다.
```

### 11.2 면접 시연 순서

```text
1. Asset Class 선택 화면을 보여준다.
2. Model Design Framework를 설명한다.
3. Office를 선택한다.
4. SK Seorin Building public research case를 불러온다.
5. Source Tracker에서 확인값과 추정치를 설명한다.
6. Sensitivity와 Memo를 보여준다.
7. Infrastructure - Renewable Power를 선택한다.
8. P50/P90, PPA, Merchant Revenue, DSCR을 설명한다.
9. 자산군별 모델 구조가 왜 달라지는지 정리한다.
```

### 11.3 면접 답변 예시

질문: 이거 AI가 만든 모델인가요?

```text
아닙니다. AI는 향후 자연어 입력 구조화나 메모 작성 보조에 사용할 수 있지만, 핵심 계산은 Python 함수로 직접 구현했습니다. 오피스의 NOI, Exit Value, IRR, DSCR과 인프라의 PPA Revenue, EBITDA, DSCR은 모두 결정론적 계산 엔진으로 처리됩니다.
```

질문: 실제 딜인가요?

```text
오피스 케이스는 공개자료 기반 리서치 케이스이고, 인프라 케이스는 교육용 IM 기반 모델링 케이스입니다. 모든 숫자를 실제값이라고 주장하지 않고, 확인값과 추정치를 Source Tracker로 구분했습니다.
```

질문: 이 프로젝트에서 가장 중요한 점은 무엇인가요?

```text
대체투자에서는 자산군별로 현금흐름 원천과 리스크 드라이버가 다르다는 점을 모델 구조로 반영한 것입니다. 오피스는 임대료와 Exit Cap이 중요하고, 인프라는 PPA 계약, 발전량, Merchant price, DSCR이 중요하다고 보고 별도 모델로 분리했습니다.
```

## 12. SRT-RE 부동산본부 지원 시 강조점

회계법인 SRT-RE 부동산본부에 지원할 때는 다음 메시지가 가장 중요하다.

```text
단순히 수익률을 계산하는 도구가 아니라,
거래 검토 과정에서 필요한 가정 정리, 출처 확인, 현금흐름 분석,
민감도 분석, 리스크 요약, 투자검토 메모 작성을 구조화한 프로젝트입니다.
```

SRT-RE 관점에서 연결되는 업무:

```text
부동산 Transaction 자문
사업 타당성 검토
재무모델링
민감도 분석
가정 검증
투자검토 메모 작성
```

## 13. 한계와 향후 개선 방향

현재 한계:

```text
오피스 렌트롤 업로드 기능은 아직 없음
인프라 모델은 단순화된 MVP 구조
Excel 다운로드는 오피스 모델 중심
LLCR, debt sculpting, reserve account는 아직 미구현
```

향후 개선 방향:

```text
렌트롤 업로드
WALE 및 임차인 집중도 분석
인프라 LLCR 계산
P90 downside sensitivity
인프라 Excel export
PDF/Word 투자검토 메모 생성
AI 자연어 입력 구조화
```

## 14. 요약

이 프로젝트는 단순한 계산기가 아니다.

```text
자산군을 선택하고
자산군별 모델을 적용하고
가정의 출처를 추적하고
현금흐름과 대출상환능력을 계산하고
민감도와 리스크를 확인하고
투자검토 메모로 정리하는 도구
```

취업 준비에서는 이 프로젝트를 통해 다음을 보여주면 된다.

```text
대체투자 자산군에 대한 이해
재무모델링 구조에 대한 이해
가정 검증과 출처 관리에 대한 문제의식
AI를 계산기가 아니라 업무 보조도구로 제한하는 설계 판단
결과를 면접과 자기소개서에서 설명할 수 있는 커뮤니케이션 역량
```

