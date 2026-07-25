"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { hotels, type Hotel } from "./hotels";
import { getHotelProfile } from "./hotelProfiles";

type GradeFilter = "all" | 5 | 4 | "transaction";

const zones = ["전체 권역", "CBD", "GBD", "YBD", "용산·이태원", "서북·홍대", "마곡·김포공항", "동서울", "서남", "기타"];

const formatNumber = (value: number) => new Intl.NumberFormat("ko-KR").format(value);

export default function HotelExplorer() {
  const [grade, setGrade] = useState<GradeFilter>("all");
  const [zone, setZone] = useState("전체 권역");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Hotel | null>(hotels.find((hotel) => hotel.transaction) ?? hotels[0]);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [detailTab, setDetailTab] = useState<"asset" | "investment" | "location" | "sources">("asset");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return hotels
      .filter((hotel) => grade === "all" || (grade === "transaction" ? hotel.transaction : hotel.grade === grade))
      .filter((hotel) => zone === "전체 권역" || hotel.zone === zone)
      .filter((hotel) => !normalized || [hotel.name, hotel.address, hotel.district, hotel.brand].join(" ").toLowerCase().includes(normalized))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [grade, zone, query]);

  const totalRooms = hotels.reduce((sum, hotel) => sum + hotel.rooms, 0);
  const transactionCount = hotels.filter((hotel) => hotel.transaction).length;

  const choose = useCallback((hotel: Hotel) => {
    setSelected(hotel);
    setDetailTab("asset");
  }, []);

  const profile = selected ? getHotelProfile(selected) : null;

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="brand-block">
          <div className="brand-mark">SH</div>
          <div>
            <p className="eyebrow">SEOUL HOTEL CAPITAL MAP</p>
            <h1>서울 호텔 투자 인텔리전스</h1>
          </div>
        </div>
        <div className="header-meta">
          <span className="status-dot" /> 데이터 기준 2026.07.24
          <span className="header-rule" />
          <span>서울 4·5성급 전수</span>
        </div>
      </header>

      <section className="kpi-rail" aria-label="시장 요약">
        <Kpi label="분석 자산" value={`${hotels.length}`} unit="개" />
        <Kpi label="객실 공급" value={formatNumber(totalRooms)} unit="실" />
        <Kpi label="5성급" value={`${hotels.filter((h) => h.grade === 5).length}`} unit="개" tone="gold" />
        <Kpi label="4성급" value={`${hotels.filter((h) => h.grade === 4).length}`} unit="개" tone="teal" />
        <Kpi label="거래 사례" value={`${transactionCount}`} unit="건" tone="red" />
      </section>

      <section className="filter-bar">
        <div className="segmented" aria-label="등급 필터">
          {([
            ["all", "전체"],
            [5, "5성급"],
            [4, "4성급"],
            ["transaction", "거래 확인"],
          ] as const).map(([value, label]) => (
            <button key={value} className={grade === value ? "active" : ""} onClick={() => setGrade(value)}>{label}</button>
          ))}
        </div>
        <label className="search-box">
          <span>⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="호텔명·주소·브랜드 검색" />
          {query && <button onClick={() => setQuery("")} aria-label="검색어 지우기">×</button>}
        </label>
        <select value={zone} onChange={(event) => setZone(event.target.value)} aria-label="권역 선택">
          {zones.map((item) => <option key={item}>{item}</option>)}
        </select>
        <div className="result-count"><strong>{filtered.length}</strong> assets</div>
      </section>

      <div className="mobile-switch">
        <button className={mobileView === "map" ? "active" : ""} onClick={() => setMobileView("map")}>지도</button>
        <button className={mobileView === "list" ? "active" : ""} onClick={() => setMobileView("list")}>리스트</button>
      </div>

      <section className={`workspace ${selected ? "detail-open" : ""}`}>
        <aside className={`asset-panel ${mobileView === "list" ? "mobile-on" : ""}`}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ASSET UNIVERSE</p>
              <h2>호텔 자산 목록</h2>
            </div>
            <span>호텔명순</span>
          </div>
          <div className="asset-list">
            {filtered.map((hotel) => (
              <button key={hotel.id} className={`asset-card ${selected?.id === hotel.id ? "selected" : ""}`} onClick={() => choose(hotel)}>
                <span className="card-main">
                  <span className="card-topline">
                    <span className={`grade-pill grade-${hotel.grade}`}>{hotel.grade}성</span>
                    <span>{hotel.zone}</span>
                    {hotel.transaction && <span className="deal-pill">DEAL</span>}
                  </span>
                  <strong>{hotel.name}</strong>
                  <span className="card-meta">{hotel.district} · {formatNumber(hotel.rooms)}실 · {hotel.brand}</span>
                </span>
              </button>
            ))}
            {!filtered.length && <div className="empty-state">조건에 맞는 자산이 없습니다.</div>}
          </div>
        </aside>

        <section className={`map-panel ${mobileView === "map" ? "mobile-on" : ""}`} aria-label="서울 호텔 지도">
          <HotelMap visibleHotels={filtered} selected={selected} onSelect={choose} />
          <div className="map-legend">
            <span><i className="legend-dot five" /> 5성급</span>
            <span><i className="legend-dot four" /> 4성급</span>
            <span><i className="legend-ring" /> 거래 확인</span>
          </div>
          <div className="map-caption">
            <p className="eyebrow">SEOUL / 37.5665° N</p>
            <strong>{zone === "전체 권역" ? "서울 전역" : zone}</strong>
            <span>{filtered.length}개 자산 표시</span>
          </div>
          <div className="map-attribution">© OpenStreetMap contributors</div>
        </section>

        {selected && profile && (
          <aside className="detail-panel">
            <button className="close-detail" onClick={() => setSelected(null)} aria-label="상세 닫기">×</button>
            <div className="detail-hero">
              <div className="detail-tags">
                <span className={`grade-pill grade-${selected.grade}`}>{selected.grade}성급</span>
                <span>{selected.zone}</span>
                <span>{selected.assetType}</span>
              </div>
              <p className="eyebrow">{selected.id} / INVESTMENT CARD</p>
              <h2>{selected.name}</h2>
              <p>{selected.address}</p>
              <div className="research-line"><span>원문·공공자료 연결</span><strong>{profile.sources.length}건</strong><span>확인 항목</span><strong>{profile.verifiedCount}개</strong></div>
            </div>
            <div className="detail-metrics">
              <Metric label="객실수" value={`${formatNumber(selected.rooms)}실`} />
              <Metric label="브랜드군" value={selected.brand} />
              <Metric label="등급 결정일" value={selected.gradeDate} />
            </div>
            <div className="detail-tabs">
              {([['asset','자산'],['investment','투자·공시'],['location','입지·상권'],['sources','출처']] as const).map(([key,label]) =>
                <button key={key} className={detailTab === key ? "active" : ""} onClick={() => setDetailTab(key)}>{label}</button>
              )}
            </div>

            {detailTab === "asset" && <>
              <div className="profile-block">
                <div className="section-title"><span>준공·개관</span><b>ASSET</b></div>
                <strong>{profile.opening}</strong>
                <p className="subcopy">{profile.renovation}</p>
              </div>
              <div className="profile-block">
                <div className="section-title"><span>대표 시설</span><b>OFFICIAL WEB</b></div>
                <div className="facility-chips">{profile.facilities.map((item) => <span key={item}>{item}</span>)}</div>
                <a className="official-link" href={profile.officialUrl} target="_blank" rel="noreferrer">호텔 공식 홈페이지에서 상세 확인 ↗</a>
              </div>
              <div className="profile-block">
                <div className="section-title"><span>건축물대장 자산 정보</span><b className={`registry-badge ${profile.buildingRegisterStatus === "재매칭 필요" ? "review" : ""}`}>{profile.buildingRegisterStatus}</b></div>
                {profile.assetMetrics.length > 0 && <div className="asset-metric-grid">{profile.assetMetrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></div>)}</div>}
                <dl className="fact-list rich-facts">{profile.physicalFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd><span className={`fact-status ${fact.status === "확인중" ? "pending" : ""}`}>{fact.status}</span></div>)}</dl>
                <p className={`registry-note ${profile.buildingRegisterStatus === "재매칭 필요" ? "review" : ""}`}>{profile.buildingRegisterNote}</p>
              </div>
            </>}

            {detailTab === "investment" && <>
              {selected.transaction ? (
                <div className="deal-box">
                  <div className="section-title"><span>확인 거래</span><b>CONF. {selected.transaction.confidence}</b></div>
                  <div className="deal-amount"><strong>{formatNumber(selected.transaction.amount)}</strong><span>억원</span></div>
                  <div className="deal-grid"><span>거래연도<b>{selected.transaction.year}</b></span><span>객실당<b>{formatNumber(selected.transaction.perKey)}억원</b></span><span>투자유형<b>{selected.transaction.theme}</b></span></div>
                  <p>{selected.transaction.buyer}</p>
                </div>
              ) : <div className="no-deal-box"><span>공개 거래 미확인</span><p>거래가를 임의 추정하지 않았습니다. 등기·펀드 공시·감정평가서 원문 확인이 필요합니다.</p></div>}
              <div className="profile-block dd-coverage-block">
                <div className="section-title"><span>투자 DD 데이터 커버리지</span><b>EVIDENCE</b></div>
                <div className="dd-coverage-grid">{profile.ddCoverage.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong><b className={`coverage-status status-${item.status.replace(" ", "-")}`}>{item.status}</b></div>)}</div>
              </div>
              {profile.investmentMetrics.length > 0 && <div className="profile-block">
                <div className="section-title"><span>{selected.district} 거래·수요 근거</span><b>PUBLIC DATA</b></div>
                <div className="investment-evidence-grid">{profile.investmentMetrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></div>)}</div>
                <p className="investment-data-note">{profile.investmentDataNote}</p>
              </div>}
              {profile.comparableDeals.length > 0 && <div className="profile-block">
                <div className="section-title"><span>최근 권역 숙박시설 거래</span><b>RTMS</b></div>
                <div className="comp-deal-list">{profile.comparableDeals.map((deal, index) => <div key={`${deal.date}-${deal.location}-${index}`}><span>{deal.date}</span><strong>{deal.location}</strong><b>{deal.amount}</b><small>{deal.area} · {deal.unitPrice}</small></div>)}</div>
                <p className="subcopy">지번 일부가 비공개된 권역 비교사례입니다. 대상 호텔과 동일 자산 여부 및 일괄거래 범위는 공시·등기 원문으로 교차확인합니다.</p>
              </div>}
              {profile.disclosureEntities.length > 0 && <div className="profile-block">
                <div className="section-title"><span>관련 법인 최근 공시</span><b>OPEN DART</b></div>
                <div className="disclosure-list">{profile.disclosureEntities.map((entity) => <section key={entity.name}><div className="disclosure-entity"><strong>{entity.name}</strong><span>{entity.corpName}</span></div>{entity.filings.map((filing) => <a key={filing.receiptNo} href={`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${filing.receiptNo}`} target="_blank" rel="noreferrer"><span>{`${filing.date.slice(0,4)}.${filing.date.slice(4,6)}.${filing.date.slice(6,8)}`}</span><strong>{filing.reportName}</strong><b>↗</b></a>)}</section>)}</div>
                <p className="subcopy">관련 법인의 공시 목록이며 해당 호텔에 직접 귀속되는 내용인지는 보고서 원문과 연결 주석을 확인해야 합니다.</p>
              </div>}
              <div className="profile-block">
                <div className="section-title"><span>소유·운영 구조</span><b>VERIFY</b></div>
                <dl className="fact-list structure-facts">{profile.structureFacts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd><span className={`fact-status ${fact.status === "확인중" ? "pending" : ""}`}>{fact.status}</span></div>)}</dl>
                <p className="subcopy">{profile.ownershipNote}</p>
              </div>
              <div className="profile-block"><div className="section-title"><span>핵심 투자 DD</span><b>CHECK</b></div><p>{selected.dd}</p><ul className="dd-list"><li>토지·건물 등기상 소유자와 담보권</li><li>운영계약 기간·수수료·해지권·GOP 보장</li><li>최근 3개년 CAPEX와 향후 객실·설비 투자계획</li><li>거래가격에 리테일·오피스 등 복합부분 포함 여부</li></ul></div>
            </>}

            {detailTab === "location" && <>
              <div className="profile-block location-lead"><div className="section-title"><span>{selected.zone} 입지</span><b>SUBMARKET</b></div><p>{profile.locationSummary}</p></div>
              <div className="profile-block"><div className="section-title"><span>주요 거점 직선거리</span><b>COORDINATE</b></div><div className="distance-list">{profile.nearbyNodes.map((node) => <div key={node.name}><span>{node.category}</span><strong>{node.name}</strong><b>{node.distanceKm < 1 ? `${Math.round(node.distanceKm * 1000)}m` : `${node.distanceKm.toFixed(1)}km`}</b></div>)}</div><p className="subcopy">호텔 좌표와 주요 거점 좌표 간 직선거리입니다. 실제 도보·차량거리는 교통망 연계 후 확정합니다.</p></div>
              <div className="profile-block"><div className="section-title"><span>주요 수요 발생원</span><b>DEMAND</b></div><ul>{profile.demandDrivers.map(x => <li key={x}>{x}</li>)}</ul></div>
              <div className="profile-block"><div className="section-title"><span>인접 핵심 상권·시설</span><b>AREA</b></div><div className="nearby-grid">{profile.nearby.map(x => <span key={x}>{x}</span>)}</div><p className="subcopy">거리·도보시간은 향후 교통 API 및 현장실사로 보강합니다.</p></div>
              <div className="profile-block market-block"><div className="section-title"><span>권역 시장 해석</span><b>MARKET</b></div><ul>{profile.marketSignals.map(x => <li key={x}>{x}</li>)}</ul></div>
            </>}

            {detailTab === "sources" && <>
              <div className="profile-block"><div className="section-title"><span>자산별 근거자료</span><b>{profile.sources.length} LINKS</b></div><div className="source-list">{profile.sources.map((source) => <a key={source.label+source.url} href={source.url} target="_blank" rel="noreferrer"><span>{source.kind}</span><strong>{source.label}</strong><b>↗</b></a>)}</div></div>
              <div className="detail-section source-note"><div className="section-title"><span>검증 기준</span><b>{selected.coordinateConfidence === "address" ? "HIGH" : "MID"}</b></div><p>등급·객실·주소는 문화체육관광부 자료를 우선 사용했습니다. 시설은 공식 홈페이지, 거래는 공시·시장자료를 연결했습니다. ‘미확인’ 항목은 임의 추정하지 않습니다.</p></div>
            </>}
          </aside>
        )}
      </section>
    </main>
  );
}

function HotelMap({ visibleHotels, selected, onSelect }: { visibleHotels: Hotel[]; selected: Hotel | null; onSelect: (hotel: Hotel) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [37.5665, 126.978],
      zoom: 11,
      minZoom: 10,
      maxZoom: 17,
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const resize = new ResizeObserver(() => map.invalidateSize({ animate: false, pan: false }));
    resize.observe(containerRef.current);

    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    visibleHotels.forEach((hotel) => {
      const isSelected = selected?.id === hotel.id;
      if (hotel.transaction) {
        L.circleMarker([hotel.lat, hotel.lng], {
          radius: isSelected ? 13 : 10,
          color: "#a63a2c",
          weight: 3,
          opacity: 0.92,
          fillOpacity: 0,
          interactive: false,
        }).addTo(layer);
      }

      const marker = L.circleMarker([hotel.lat, hotel.lng], {
        radius: isSelected ? 8 : 6,
        color: isSelected ? "#102a25" : "#ffffff",
        weight: isSelected ? 3 : 2,
        fillColor: hotel.grade === 5 ? "#a77824" : "#0e756b",
        fillOpacity: 0.96,
      })
        .bindTooltip(`<strong>${hotel.name}</strong><br>${hotel.grade}성 · ${hotel.rooms.toLocaleString("ko-KR")}실`, {
          direction: "top",
          offset: [0, -7],
          className: "hotel-tooltip",
        })
        .on("click", (event: any) => {
          if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
          onSelect(hotel);
        });
      marker.addTo(layer);
    });
  }, [visibleHotels, selected, onSelect]);

  useEffect(() => {
    if (!selected || !mapRef.current) return;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const map = mapRef.current;
        if (!map) return;
        map.invalidateSize({ animate: false, pan: false });
        map.panInside([selected.lat, selected.lng], {
          paddingTopLeft: [72, 72],
          paddingBottomRight: [72, 72],
          animate: false,
        });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected]);

  return <div ref={containerRef} className="leaflet-map" aria-label="드래그와 확대·축소가 가능한 서울 호텔 지도" />;
}

function Kpi({ label, value, unit, tone = "" }: { label: string; value: string; unit: string; tone?: string }) {
  return <div className={`kpi ${tone}`}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
