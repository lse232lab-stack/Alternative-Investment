# 대체투자 자산군별 재무모델링 확장 로드맵

## 1. 프로젝트 방향

이 프로젝트는 특정 자산 하나만 분석하는 모델이 아니라, 대체투자에서 다루는 자산군마다 현금흐름 구조와 리스크 드라이버가 다르다는 점을 보여주기 위한 종합 언더라이팅 프레임워크입니다.

핵심 원칙은 다음과 같습니다.

- 계산은 Python 함수로 고정한다.
- AI는 계산기가 아니라 구조화, 코드 작성, 메모 초안 작성 보조로만 활용한다.
- 공개자료로 확인 가능한 값과 모델링상 추정값을 구분한다.
- 자산군별로 어떤 정량지표와 정성요소가 연결되는지 설명한다.
- 처음부터 완성형 실무 모델을 주장하지 않고, 학습 가능한 모듈형 모델로 확장한다.

## 2. 현재 자산군 구조

| 구분 | 자산군 | 모델 상태 | 핵심 지표 |
|---|---|---|---|
| Real Estate | Office | 상세 모델 | NOI, DSCR, IRR, Equity Multiple, Exit Cap |
| Infrastructure | Renewable Power | 상세 모델 | P50/P90, PPA Revenue, Merchant Revenue, DSCR, IRR |
| Real Estate | Logistics | 상세 모델 | NOI, Occupancy, Rent Growth, Renewal Spread, Exit Cap |
| Real Estate / Infra | Data Center | 상세 모델 | MW Capacity, Utilization, Power Cost, EBITDA Margin, CAPEX |
| Real Estate | Multifamily | 템플릿 모델 | Occupancy, Rent Growth, Turnover, Maintenance CAPEX |
| Real Estate Operating Asset | Hotel | 템플릿 모델 | ADR, Occupancy, RevPAR, EBITDA Margin |
| Infrastructure | Toll Road / PPP | 템플릿 모델 | Traffic, Toll Rate, Concession Life, DSCR |
| Private Debt | Private Credit | 상세 모델 | Coupon, Default Rate, Recovery, Expected Loss, Prepayment |
| Private Equity | Buyout | 상세 모델 | EBITDA Growth, Leverage, Exit Multiple, Deleveraging |
| Private Funds | Secondaries / NAV | 템플릿 모델 | NAV Discount, Distribution Yield, NAV Growth |

## 3. 공개자료 기반 대표 케이스 선정 방식

실제 딜 내부자료를 확보하기 어렵기 때문에, 각 자산군은 공개자료가 많은 상장사, 리츠, BDC, 인프라 운영사, 공시자료를 우선 활용합니다.

예시는 다음과 같습니다.

- Office: 국내 DART, 리츠정보시스템, 브로커 시장보고서 기반 오피스 케이스
- Logistics: Prologis와 같은 글로벌 물류 리츠의 연차보고서 및 투자자 자료
- Data Center: Equinix, Digital Realty 등 데이터센터 운영사의 공시 및 투자자 자료
- Renewable Power: 발전용량, PPA, 생산량, O&M 구조가 있는 교육용 또는 공개 프로젝트 케이스
- Toll Road / PPP: 상장 인프라 운영사 공시, 교통량 자료, concession report
- Private Credit: Ares Capital 등 BDC 공시자료
- Private Equity Buyout: 상장사 재무제표 기반 LBO 학습 케이스
- Secondaries / NAV: 상장 PE trust의 NAV, 할인율, 분배금 자료

## 4. 자산군별 모델링 관점

### Office

임대료, 공실률, 운영비, CAPEX, LTV, 대출금리, Exit Cap이 NOI와 투자수익률에 어떻게 연결되는지 분석합니다. 입지, 임차인 안정성, 임대차 만기, 시장 임대료가 핵심 정성요소입니다.

### Logistics

물류센터는 입지, 도심 접근성, 임차인 수요, 공급 파이프라인이 중요합니다. Office와 유사한 NOI 모델을 사용하되, 시장 임대료 성장률과 재계약 스프레드, 개발 공급 리스크를 별도로 확인해야 합니다.

### Data Center

데이터센터는 부동산과 인프라의 성격을 함께 가집니다. 임대수익뿐 아니라 전력 확보, 냉각 효율, 고객 계약, AI 및 클라우드 수요, 개발 CAPEX가 핵심입니다.

### Renewable Power

재생에너지는 발전량, P50/P90 생산 시나리오, PPA 계약, merchant exposure, O&M, 계통연계, curtailment가 주요 변수입니다. 대출 관점에서는 DSCR과 downside production case가 중요합니다.

### Toll Road / PPP

교통량, 통행료, 물가연동, concession life, major maintenance CAPEX가 현금흐름을 결정합니다. 단순 IRR보다 규제, 수요 예측, 재무약정, 장기 운영비를 함께 봐야 합니다.

### Private Credit

쿠폰이 높더라도 default rate와 recovery를 함께 봐야 합니다. 차주의 EBITDA, 선순위 여부, covenant, sponsor quality, 산업 집중도, non-accrual 비율이 핵심입니다.

### Private Equity Buyout

EBITDA 성장, debt capacity, deleveraging, exit multiple이 equity return을 좌우합니다. 회계상 EBITDA가 실제 현금창출력과 연결되는지, CAPEX와 운전자본이 과소추정되지 않았는지 점검해야 합니다.

### Secondaries / Fund NAV

NAV 할인율, 분배금, NAV 성장률, unfunded commitment, vintage mix, liquidity discount가 주요 변수입니다. 공개 NAV가 실제 회수 가능 가치와 얼마나 차이가 날 수 있는지 검토해야 합니다.

## 5. 향후 개발 우선순위

1. Logistics, Data Center, Private Credit, PE Buyout 상세 모델의 공개자료 기반 입력값을 더 정교화
2. Private Credit 모델에 default/recovery sensitivity와 covenant checklist 추가
3. PE Buyout 모델에 sources and uses, EBITDA bridge, debt tranche 구조 추가
4. Secondaries 모델에 NAV haircut, unfunded commitment, distribution waterfall 추가
5. Hotel과 Toll Road / PPP를 상세 모델로 승격
6. 각 자산군별 공개자료 링크와 Source Tracker 고도화
7. Excel export를 Office 외 자산군으로 확장

## 6. 포트폴리오 설명 문장

이 프로젝트는 대체투자 자산군별 현금흐름 구조를 비교하고, 공개자료 기반으로 확인 가능한 값과 모델링상 추정값을 구분하며, 자산군별 주요 수익성 지표와 리스크 드라이버를 연결해보는 학습형 언더라이팅 도구입니다.

특히 부동산, 인프라, 사모대출, 사모주식, 펀드 세컨더리 등 자산군마다 다른 정량지표와 정성요소가 어떻게 투자 가정으로 전환되는지 이해하는 데 초점을 두었습니다.
