import React, { useEffect, useMemo, useState } from "react";
import HotelExplorer from "./HotelExplorer";
import { hotels, type Hotel } from "./hotels";

type SessionUser = { id: string; username: string; displayName: string; isAdmin: boolean };
type AppContext = { getToken: () => Promise<string | null>; user: SessionUser };
type Stage = "Screening" | "Underwriting" | "LOI" | "Due Diligence" | "IC Review" | "Closing" | "Portfolio" | "Exit";
type Model = {
  hotelId: string; stage: Stage; purchasePrice: number; occupancy: number; adr: number; otherRevenuePct: number;
  gopMargin: number; managementFeePct: number; ffePct: number; capex: number; debtPct: number; interestRate: number;
  amortization: number; holdYears: number; revenueGrowth: number; exitCap: number; seniorPct: number; mezzPct: number;
  seniorRate: number; mezzRate: number; downsideOcc: number; downsideAdr: number; actualOccupancy: number; actualAdr: number;
  actualNoi: number; notes: string; dd: Record<string, boolean>;
};
type SavedDeal = { id: string; hotelId: string; hotelName: string; stage: Stage; updatedAt: string; ownerName: string; model: Model };
type DealDocument = { id: string; filename: string; contentType: string; sizeBytes: number; uploaderName: string; createdAt: string };

const stages: Stage[] = ["Screening", "Underwriting", "LOI", "Due Diligence", "IC Review", "Closing", "Portfolio", "Exit"];
const ddItems = [
  "토지·건물 등기 및 담보권", "건축물대장·위반건축물", "토지이용계획·인허가", "운영위탁·브랜드 계약",
  "최근 36개월 운영실적", "객실·F&B 매출 원장", "인건비·에너지·수선비", "CAPEX·PIP·FF&E 계획",
  "세무·법무·소송", "환경·구조·소방·내진", "대출약정·Covenant", "보험·BCP·사이버보안",
];

const won = (value: number, digits = 0) => `${value.toLocaleString("ko-KR", { maximumFractionDigits: digits })}억원`;
const pct = (value: number, digits = 1) => `${value.toFixed(digits)}%`;
const multiple = (value: number) => `${value.toFixed(2)}x`;

function defaultModel(hotel: Hotel): Model {
  const implied = hotel.transaction?.amount || Math.max(650, hotel.rooms * (hotel.grade === 5 ? 8.5 : 5.2));
  return {
    hotelId: hotel.id, stage: "Screening", purchasePrice: Math.round(implied), occupancy: 72, adr: hotel.grade === 5 ? 390000 : 230000,
    otherRevenuePct: 34, gopMargin: 35, managementFeePct: 4, ffePct: 4, capex: Math.round(hotel.rooms * 0.55), debtPct: 60,
    interestRate: 5.5, amortization: 1.5, holdYears: 5, revenueGrowth: 3, exitCap: 5.75, seniorPct: 50, mezzPct: 10,
    seniorRate: 5.2, mezzRate: 8.5, downsideOcc: 62, downsideAdr: 85, actualOccupancy: 69, actualAdr: hotel.grade === 5 ? 372000 : 218000,
    actualNoi: 0, notes: "", dd: Object.fromEntries(ddItems.map((item) => [item, false])),
  };
}

function irr(cashflows: number[]) {
  let low = -0.95, high = 3;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const npv = cashflows.reduce((sum, flow, year) => sum + flow / Math.pow(1 + mid, year), 0);
    if (npv > 0) low = mid; else high = mid;
  }
  return ((low + high) / 2) * 100;
}

function calculate(hotel: Hotel, model: Model, occ = model.occupancy, adrFactor = 100, exitCap = model.exitCap) {
  const roomRevenue = hotel.rooms * 365 * (occ / 100) * model.adr * (adrFactor / 100) / 100000000;
  const totalRevenue = roomRevenue * (1 + model.otherRevenuePct / 100);
  const gop = totalRevenue * model.gopMargin / 100;
  const managementFee = totalRevenue * model.managementFeePct / 100;
  const ffe = totalRevenue * model.ffePct / 100;
  const noi = Math.max(0, gop - managementFee - ffe);
  const debt = model.purchasePrice * model.debtPct / 100;
  const senior = model.purchasePrice * model.seniorPct / 100;
  const mezz = model.purchasePrice * model.mezzPct / 100;
  const annualDebtService = senior * (model.seniorRate + model.amortization) / 100 + mezz * model.mezzRate / 100;
  const equity = model.purchasePrice + model.capex - debt;
  const annualCashflows = [-equity];
  let yearNoi = noi;
  let remainingDebt = debt;
  for (let year = 1; year <= model.holdYears; year++) {
    if (year > 1) yearNoi *= 1 + model.revenueGrowth / 100;
    remainingDebt = Math.max(0, remainingDebt - senior * model.amortization / 100);
    let cash = yearNoi - annualDebtService;
    if (year === model.holdYears) cash += yearNoi * (1 + model.revenueGrowth / 100) / (exitCap / 100) - remainingDebt;
    annualCashflows.push(cash);
  }
  const exitValue = yearNoi * (1 + model.revenueGrowth / 100) / (exitCap / 100);
  const equityProceeds = annualCashflows.slice(1).reduce((a, b) => a + b, 0);
  return {
    roomRevenue, totalRevenue, gop, noi, debt, senior, mezz, equity, annualDebtService,
    dscr: annualDebtService ? noi / annualDebtService : 0, debtYield: debt ? noi / debt * 100 : 0,
    ltv: model.debtPct, capRate: model.purchasePrice ? noi / model.purchasePrice * 100 : 0,
    irr: irr(annualCashflows), equityMultiple: equity ? equityProceeds / equity : 0, exitValue, cashflows: annualCashflows,
  };
}

function Field({ label, value, onChange, suffix, step = 1 }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number }) {
  return <label className="uw-field"><span>{label}</span><div><input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))}/>{suffix && <b>{suffix}</b>}</div></label>;
}

function Metric({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return <div className={`uw-metric ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function InstitutionalWorkbench({ context }: { context: AppContext }) {
  const [selectedId, setSelectedId] = useState(hotels.find((h) => h.transaction)?.id || hotels[0].id);
  const selected = hotels.find((hotel) => hotel.id === selectedId) || hotels[0];
  const [model, setModel] = useState<Model>(() => defaultModel(selected));
  const [view, setView] = useState<"underwriting" | "pf" | "sensitivity" | "dd" | "ic" | "portfolio">("underwriting");
  const [deals, setDeals] = useState<SavedDeal[]>([]);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState("저장 준비");
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [uploadState, setUploadState] = useState("문서 업로드");
  const result = useMemo(() => calculate(selected, model), [selected, model]);
  const downside = useMemo(() => calculate(selected, model, model.downsideOcc, model.downsideAdr, model.exitCap + 1), [selected, model]);
  const completedDd = Object.values(model.dd).filter(Boolean).length;

  const set = <K extends keyof Model>(key: K, value: Model[K]) => setModel((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    context.getToken().then((token) => token ? fetch("/api/deals", { headers: { Authorization: `Bearer ${token}` } }) : Promise.reject()).then((r) => r.ok ? r.json() : Promise.reject(r)).then((data) => setDeals(data.deals || [])).catch(() => setDeals([]));
  }, [context]);

  useEffect(() => {
    if (!activeDealId) { setDocuments([]); return; }
    context.getToken().then((token) => token ? fetch(`/api/deals/${activeDealId}/documents`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.reject()).then((r) => r.ok ? r.json() : Promise.reject(r)).then((data) => setDocuments(data.documents || [])).catch(() => setDocuments([]));
  }, [activeDealId, context]);

  function chooseHotel(id: string) {
    const hotel = hotels.find((item) => item.id === id) || hotels[0];
    setSelectedId(id); setModel(defaultModel(hotel)); setActiveDealId(null); setSaveState("새 딜");
  }

  function openDeal(deal: SavedDeal) {
    setSelectedId(deal.hotelId); setModel(deal.model); setActiveDealId(deal.id); setSaveState("저장됨");
  }

  async function saveDeal() {
    setSaveState("저장 중…");
    const token = await context.getToken();
    if (!token) { setSaveState("로그인 만료"); return; }
    const headers = { "content-type": "application/json", Authorization: `Bearer ${token}` };
    const payload = { hotelId: selected.id, hotelName: selected.name, stage: model.stage, model };
    const response = await fetch(activeDealId ? `/api/deals/${activeDealId}` : "/api/deals", { method: activeDealId ? "PUT" : "POST", headers, body: JSON.stringify(payload) });
    if (!response.ok) { setSaveState("저장 실패"); return; }
    const data = await response.json();
    setActiveDealId(data.deal.id); setDeals((current) => [data.deal, ...current.filter((deal) => deal.id !== data.deal.id)]); setSaveState("저장 완료");
  }

  async function uploadDocuments(files: FileList | null) {
    if (!files?.length) return;
    if (!activeDealId) { setUploadState("딜을 먼저 저장하세요"); return; }
    setUploadState("업로드 중…");
    const token = await context.getToken();
    if (!token) { setUploadState("로그인 만료"); return; }
    for (const file of Array.from(files)) {
      const form = new FormData(); form.append("file", file);
      const response = await fetch(`/api/deals/${activeDealId}/documents`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!response.ok) { setUploadState("일부 업로드 실패"); return; }
      const data = await response.json(); setDocuments((current) => [data.document, ...current]);
    }
    setUploadState("업로드 완료");
  }

  async function downloadDocument(document: DealDocument) {
    if (!activeDealId) return;
    const token = await context.getToken(); if (!token) return;
    const response = await fetch(`/api/deals/${activeDealId}/documents/${document.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    const url = URL.createObjectURL(await response.blob()); const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = document.filename; anchor.click(); URL.revokeObjectURL(url);
  }

  const sensitivityOcc = [model.occupancy - 10, model.occupancy - 5, model.occupancy, model.occupancy + 5, model.occupancy + 10];
  const sensitivityCaps = [model.exitCap - .75, model.exitCap - .375, model.exitCap, model.exitCap + .375, model.exitCap + .75];
  const riskFlags = [
    result.dscr < 1.35 && `DSCR ${multiple(result.dscr)}로 권고 수준 하회`,
    result.debtYield < 8 && `Debt Yield ${pct(result.debtYield)}로 낮음`,
    downside.irr < 0 && `Downside IRR ${pct(downside.irr)}로 원금손실 가능`,
    completedDd < 8 && `핵심 실사 ${12 - completedDd}개 미완료`,
    model.debtPct > 65 && `총 LTV ${pct(model.debtPct)}로 레버리지 높음`,
  ].filter(Boolean) as string[];

  return <div className="institutional-shell">
    <header className="institutional-hero">
      <div><span className="eyebrow">INSTITUTIONAL ALTERNATIVES WORKBENCH</span><h1>호텔 투자·PF 통합 워크벤치</h1><p>소싱부터 언더라이팅, 투자심의, 대출 구조화와 사후관리까지 하나의 가정 체계로 연결합니다.</p></div>
      <div className="hero-actions"><select value={selectedId} onChange={(e) => chooseHotel(e.target.value)}>{hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name} · {hotel.rooms}실</option>)}</select><button onClick={saveDeal}>{saveState}</button></div>
    </header>
    <section className="deal-strip">
      <div><small>Selected Asset</small><strong>{selected.name}</strong><span>{selected.zone} · {selected.grade}성 · {selected.rooms.toLocaleString()}실</span></div>
      <div><small>Deal Stage</small><select value={model.stage} onChange={(e) => set("stage", e.target.value as Stage)}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></div>
      <Metric label="매입가" value={won(model.purchasePrice)} />
      <Metric label="Levered IRR" value={pct(result.irr)} tone={result.irr >= 12 ? "good" : "warn"}/>
      <Metric label="DSCR" value={multiple(result.dscr)} tone={result.dscr >= 1.35 ? "good" : "bad"}/>
      <Metric label="Downside IRR" value={pct(downside.irr)} tone={downside.irr >= 0 ? "warn" : "bad"}/>
    </section>
    <div className="institutional-grid">
      <aside className="deal-pipeline"><div className="panel-heading"><div><small>DEAL PIPELINE</small><h2>저장된 검토안</h2></div><b>{deals.length}</b></div>
        <button className="new-deal" onClick={() => chooseHotel(selected.id)}>+ 현재 자산 새 딜</button>
        <div className="deal-list">{deals.length ? deals.map((deal) => <button key={deal.id} className={activeDealId === deal.id ? "active" : ""} onClick={() => openDeal(deal)}><span>{deal.stage}</span><strong>{deal.hotelName}</strong><small>{deal.ownerName} · {new Date(deal.updatedAt).toLocaleDateString("ko-KR")}</small></button>) : <p className="empty-copy">저장된 딜이 없습니다. 가정을 입력하고 저장하세요.</p>}</div>
        <div className="pipeline-stats">{stages.slice(0, 6).map((stage) => <div key={stage}><span>{stage}</span><b>{deals.filter((deal) => deal.stage === stage).length}</b></div>)}</div>
      </aside>
      <main className="workbench-main">
        <nav className="workbench-tabs">{([
          ["underwriting", "운영·수익"], ["pf", "PF 구조"], ["sensitivity", "민감도"], ["dd", `DD ${completedDd}/12`], ["ic", "IC Memo"], ["portfolio", "사후관리"],
        ] as const).map(([key, label]) => <button className={view === key ? "active" : ""} onClick={() => setView(key)} key={key}>{label}</button>)}</nav>

        {view === "underwriting" && <div className="workbench-content two-column">
          <section className="model-card"><div className="panel-heading"><div><small>OPERATING MODEL</small><h2>호텔 운영 가정</h2></div><span>기준연도</span></div><div className="field-grid">
            <Field label="매입가" value={model.purchasePrice} suffix="억원" onChange={(v) => set("purchasePrice", v)}/><Field label="객실 가동률" value={model.occupancy} suffix="%" step={.5} onChange={(v) => set("occupancy", v)}/>
            <Field label="ADR" value={model.adr} suffix="원" step={10000} onChange={(v) => set("adr", v)}/><Field label="기타매출/객실" value={model.otherRevenuePct} suffix="%" onChange={(v) => set("otherRevenuePct", v)}/>
            <Field label="GOP Margin" value={model.gopMargin} suffix="%" step={.5} onChange={(v) => set("gopMargin", v)}/><Field label="운영·브랜드 수수료" value={model.managementFeePct} suffix="%" step={.25} onChange={(v) => set("managementFeePct", v)}/>
            <Field label="FF&E Reserve" value={model.ffePct} suffix="%" step={.25} onChange={(v) => set("ffePct", v)}/><Field label="초기 CAPEX" value={model.capex} suffix="억원" onChange={(v) => set("capex", v)}/>
            <Field label="매출 성장률" value={model.revenueGrowth} suffix="%" step={.25} onChange={(v) => set("revenueGrowth", v)}/><Field label="Exit Cap" value={model.exitCap} suffix="%" step={.125} onChange={(v) => set("exitCap", v)}/>
          </div></section>
          <section className="model-card dark"><div className="panel-heading"><div><small>UNDERWRITING OUTPUT</small><h2>정상화 손익</h2></div><b>Year 1</b></div><div className="output-stack">
            <div><span>객실매출</span><strong>{won(result.roomRevenue, 1)}</strong></div><div><span>총매출</span><strong>{won(result.totalRevenue, 1)}</strong></div><div><span>GOP</span><strong>{won(result.gop, 1)}</strong></div><div className="highlight"><span>정상화 NOI</span><strong>{won(result.noi, 1)}</strong></div><div><span>Going-in Cap</span><strong>{pct(result.capRate)}</strong></div><div><span>Exit Value</span><strong>{won(result.exitValue)}</strong></div>
          </div></section>
          <section className="model-card full"><div className="metric-row"><Metric label="LTV" value={pct(result.ltv)}/><Metric label="Debt Yield" value={pct(result.debtYield)} tone={result.debtYield >= 8 ? "good" : "bad"}/><Metric label="Equity Multiple" value={multiple(result.equityMultiple)}/><Metric label="Break-even Occupancy" value={pct(Math.min(100, model.occupancy / Math.max(result.dscr, .01) * 1.05))}/><Metric label="객실당 매입가" value={`${(model.purchasePrice / selected.rooms).toFixed(2)}억원`}/></div></section>
        </div>}

        {view === "pf" && <div className="workbench-content two-column">
          <section className="model-card"><div className="panel-heading"><div><small>CAPITAL STACK</small><h2>PF 금융구조</h2></div><span>총사업비 {won(model.purchasePrice + model.capex)}</span></div><div className="field-grid">
            <Field label="선순위 LTV" value={model.seniorPct} suffix="%" onChange={(v) => { set("seniorPct", v); set("debtPct", v + model.mezzPct); }}/><Field label="선순위 금리" value={model.seniorRate} suffix="%" step={.1} onChange={(v) => set("seniorRate", v)}/>
            <Field label="중순위 LTV" value={model.mezzPct} suffix="%" onChange={(v) => { set("mezzPct", v); set("debtPct", model.seniorPct + v); }}/><Field label="중순위 금리" value={model.mezzRate} suffix="%" step={.1} onChange={(v) => set("mezzRate", v)}/>
            <Field label="원금상환률" value={model.amortization} suffix="%" step={.25} onChange={(v) => set("amortization", v)}/><Field label="보유기간" value={model.holdYears} suffix="년" onChange={(v) => set("holdYears", Math.max(1, Math.min(10, v)))}/>
          </div><div className="capital-stack"><div className="senior" style={{ flex: model.seniorPct }}>선순위 {won(result.senior)}<small>{pct(model.seniorRate)}</small></div><div className="mezz" style={{ flex: model.mezzPct || 1 }}>중순위 {won(result.mezz)}<small>{pct(model.mezzRate)}</small></div><div className="equity" style={{ flex: 100 - model.debtPct }}>Equity {won(result.equity)}<small>{pct(100 - model.debtPct)}</small></div></div></section>
          <section className="model-card"><div className="panel-heading"><div><small>DEBT SIZING</small><h2>상환능력·Covenant</h2></div></div><div className="covenant-grid"><Metric label="DSCR" value={multiple(result.dscr)} tone={result.dscr >= 1.35 ? "good" : "bad"}/><Metric label="Debt Yield" value={pct(result.debtYield)} tone={result.debtYield >= 8 ? "good" : "bad"}/><Metric label="연간 Debt Service" value={won(result.annualDebtService, 1)}/><Metric label="Equity Requirement" value={won(result.equity)}/></div><div className="waterfall"><h3>현금흐름 Waterfall</h3>{["호텔 운영수입", "운영비·세금", "FF&E Reserve", "선순위 이자·원금", "중순위 이자", "배당가능현금"].map((item, index) => <div key={item}><b>{index + 1}</b><span>{item}</span></div>)}</div></section>
          <section className="model-card full"><div className="panel-heading"><div><small>PF RISK GATES</small><h2>대출 검토 경보</h2></div></div><div className="risk-grid">{riskFlags.length ? riskFlags.map((flag) => <div className="risk-flag" key={flag}><b>!</b><span>{flag}</span></div>) : <div className="risk-clear">기준 시나리오에서 주요 정량 경보가 없습니다.</div>}</div></section>
        </div>}

        {view === "sensitivity" && <div className="workbench-content"><section className="model-card"><div className="panel-heading"><div><small>TWO-WAY SENSITIVITY</small><h2>가동률 × Exit Cap Levered IRR</h2></div><span>ADR 기준 {model.adr.toLocaleString()}원</span></div><div className="sensitivity-table"><div className="corner">IRR</div>{sensitivityCaps.map((cap) => <b key={cap}>{pct(cap, 2)}</b>)}{sensitivityOcc.flatMap((occ) => [<strong key={`o-${occ}`}>{pct(occ, 0)}</strong>, ...sensitivityCaps.map((cap) => { const value = calculate(selected, model, occ, 100, cap).irr; return <span className={value >= 15 ? "high" : value >= 8 ? "mid" : value >= 0 ? "low" : "negative"} key={`${occ}-${cap}`}>{pct(value)}</span>; })])}</div></section><section className="scenario-cards"><div><small>BASE</small><strong>{pct(result.irr)}</strong><span>Occ {pct(model.occupancy)} · Exit {pct(model.exitCap)}</span></div><div className="down"><small>DOWNSIDE</small><strong>{pct(downside.irr)}</strong><span>Occ {pct(model.downsideOcc)} · ADR {pct(model.downsideAdr, 0)} · Cap +100bp</span></div><div><small>BREAK-EVEN</small><strong>{pct(Math.min(100, model.occupancy / Math.max(result.dscr, .01) * 1.05))}</strong><span>추정 객실 가동률</span></div></section><section className="model-card"><div className="field-grid"><Field label="Downside 가동률" value={model.downsideOcc} suffix="%" onChange={(v) => set("downsideOcc", v)}/><Field label="Downside ADR 지수" value={model.downsideAdr} suffix="%" onChange={(v) => set("downsideAdr", v)}/></div></section></div>}

        {view === "dd" && <div className="workbench-content two-column"><section className="model-card"><div className="panel-heading"><div><small>DUE DILIGENCE</small><h2>기관 실사 체크리스트</h2></div><b>{Math.round(completedDd / ddItems.length * 100)}%</b></div><div className="dd-progress"><i style={{ width: `${completedDd / ddItems.length * 100}%` }}/></div><div className="dd-list">{ddItems.map((item) => <label key={item} className={model.dd[item] ? "done" : ""}><input type="checkbox" checked={!!model.dd[item]} onChange={(e) => set("dd", { ...model.dd, [item]: e.target.checked })}/><span>{item}</span><b>{model.dd[item] ? "완료" : "미확인"}</b></label>)}</div></section><section className="model-card"><div className="panel-heading"><div><small>ASSET EVIDENCE</small><h2>자산·계약 실사 포인트</h2></div></div><div className="evidence-card"><span>소유자</span><strong>{selected.owner}</strong><small>법인등기·등기부 교차검증 필요</small></div><div className="evidence-card"><span>거래사례</span><strong>{selected.transaction ? `${selected.transaction.year}년 ${won(selected.transaction.amount)}` : "공개 거래 미확인"}</strong><small>{selected.transaction?.dd || selected.dd}</small></div><div className="evidence-card"><span>좌표 신뢰도</span><strong>{selected.coordinateConfidence === "address" ? "주소 정합 HIGH" : "검증 필요"}</strong><small>{selected.address}</small></div><label className="notes-field"><span>미해결 이슈·선행조건</span><textarea value={model.notes} onChange={(e) => set("notes", e.target.value)} placeholder="예: HMA Change of Control 동의, PIP 범위·금액 확정, 임차권·담보권 말소 조건…"/></label></section><section className="model-card full"><div className="panel-heading"><div><small>SECURE DATA ROOM</small><h2>딜 문서함</h2></div><label className="upload-button">{uploadState}<input type="file" multiple onChange={(e) => uploadDocuments(e.target.files)}/></label></div><div className="document-list">{documents.length ? documents.map((document) => <button key={document.id} onClick={() => downloadDocument(document)}><b>{document.filename}</b><span>{(document.sizeBytes / 1024 / 1024).toFixed(2)}MB · {document.uploaderName} · {new Date(document.createdAt).toLocaleDateString("ko-KR")}</span></button>) : <p>{activeDealId ? "등록된 문서가 없습니다." : "딜을 먼저 저장하면 보안 문서함이 활성화됩니다."}</p>}</div></section></div>}

        {view === "ic" && <div className="workbench-content"><section className="ic-memo"><header><div><small>INVESTMENT COMMITTEE MEMORANDUM</small><h2>{selected.name} 인수 검토안</h2><p>{selected.address} · {selected.rooms}실 · {selected.grade}성급 · {model.stage}</p></div><div><span>작성자</span><strong>{context.user.displayName}</strong><small>{new Date().toLocaleDateString("ko-KR")}</small></div></header><div className="ic-summary"><Metric label="Purchase Price" value={won(model.purchasePrice)}/><Metric label="Equity" value={won(result.equity)}/><Metric label="IRR" value={pct(result.irr)}/><Metric label="EM" value={multiple(result.equityMultiple)}/><Metric label="DSCR" value={multiple(result.dscr)}/><Metric label="Exit Cap" value={pct(model.exitCap)}/></div><div className="ic-columns"><article><h3>Investment Highlights</h3><ul><li>{selected.zone} 핵심 권역 내 {selected.rooms}실 규모의 {selected.grade}성급 호텔</li><li>정상화 매출 {won(result.totalRevenue, 1)}, NOI {won(result.noi, 1)} 추정</li><li>기준 Levered IRR {pct(result.irr)}, Equity Multiple {multiple(result.equityMultiple)}</li><li>객실당 인수가 {(model.purchasePrice / selected.rooms).toFixed(2)}억원</li></ul></article><article><h3>Key Risks & Mitigants</h3><ul>{riskFlags.length ? riskFlags.map((risk) => <li key={risk}>{risk}</li>) : <li>정량 기준상 중대 경보 없음. 계약·기술실사 확인 필요.</li>}<li>Downside IRR {pct(downside.irr)} · Exit Cap {pct(model.exitCap + 1)}</li></ul></article></div><div className="ic-recommendation"><div><span>Preliminary Recommendation</span><strong>{result.irr >= 12 && result.dscr >= 1.35 && downside.irr >= 0 ? "조건부 투자 검토 계속" : "구조·가격 재협상 후 재상정"}</strong></div><p>필수 선행조건: 핵심 DD 10개 이상 완료, 운영계약 Change of Control 검토, CAPEX 확정견적, 대주단 Term Sheet 확보.</p></div><footer>본 메모는 입력 가정에 따른 예비 분석이며 감정평가·법률·세무·기술실사를 대체하지 않습니다. 모든 수치는 출처와 기준일 확인이 필요합니다.</footer></section></div>}

        {view === "portfolio" && <div className="workbench-content two-column"><section className="model-card"><div className="panel-heading"><div><small>ASSET MANAGEMENT</small><h2>Actual vs Budget</h2></div><span>월간 모니터링</span></div><div className="field-grid"><Field label="Actual Occupancy" value={model.actualOccupancy} suffix="%" step={.5} onChange={(v) => set("actualOccupancy", v)}/><Field label="Actual ADR" value={model.actualAdr} suffix="원" step={10000} onChange={(v) => set("actualAdr", v)}/><Field label="Actual NOI" value={model.actualNoi || result.noi * .92} suffix="억원" step={1} onChange={(v) => set("actualNoi", v)}/></div><div className="variance-list"><div><span>Occupancy Variance</span><strong className={model.actualOccupancy >= model.occupancy ? "positive" : "negative"}>{pct(model.actualOccupancy - model.occupancy)}</strong></div><div><span>ADR Variance</span><strong className={model.actualAdr >= model.adr ? "positive" : "negative"}>{pct((model.actualAdr / model.adr - 1) * 100)}</strong></div><div><span>NOI Variance</span><strong className={(model.actualNoi || result.noi * .92) >= result.noi ? "positive" : "negative"}>{pct(((model.actualNoi || result.noi * .92) / result.noi - 1) * 100)}</strong></div></div></section><section className="model-card dark"><div className="panel-heading"><div><small>COVENANT MONITOR</small><h2>대출 약정 Headroom</h2></div></div><div className="covenant-bars">{[["DSCR", result.dscr, 1.2, 1.8], ["Debt Yield", result.debtYield, 7, 12], ["LTV Headroom", 70 - model.debtPct, 0, 20]].map(([label, value, floor, max]) => <div key={String(label)}><span>{label}</span><strong>{label === "DSCR" ? multiple(Number(value)) : pct(Number(value))}</strong><i><b style={{ width: `${Math.max(0, Math.min(100, (Number(value) - Number(floor)) / (Number(max) - Number(floor)) * 100))}%` }}/></i><small>Threshold {label === "DSCR" ? multiple(Number(floor)) : pct(Number(floor))}</small></div>)}</div><div className="monitor-alert">다음 리파이낸싱 검토: 보유 36개월차 · Exit/Refi 시나리오 분기 업데이트</div></section><section className="model-card full"><div className="panel-heading"><div><small>REPORTING CALENDAR</small><h2>운용·대주단 보고 일정</h2></div></div><div className="reporting-grid"><div><b>매월 10일</b><span>운영실적·Actual vs Budget</span></div><div><b>분기말 +20일</b><span>투자자·대주단 보고서</span></div><div><b>반기</b><span>감정가·LTV·Covenant 재검토</span></div><div><b>연 1회</b><span>사업계획·CAPEX·Exit 전략</span></div></div></section></div>}
      </main>
    </div>
  </div>;
}

export default function InstitutionalApp({ context }: { context: AppContext }) {
  const [surface, setSurface] = useState<"map" | "workbench">("workbench");
  return <><div className="product-switch"><button className={surface === "map" ? "active" : ""} onClick={() => setSurface("map")}>82개 자산 지도</button><button className={surface === "workbench" ? "active" : ""} onClick={() => setSurface("workbench")}>기관용 워크벤치</button></div>{surface === "map" ? <HotelExplorer /> : <InstitutionalWorkbench context={context}/>}</>;
}
