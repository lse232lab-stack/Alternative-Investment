"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { hotels, type Hotel } from "./hotels";

type GradeFilter = "all" | 5 | 4 | "transaction";

const zones = ["전체 권역", "CBD", "GBD", "YBD", "용산·이태원", "서북·홍대", "마곡·김포공항", "동서울", "서남", "기타"];

const formatNumber = (value: number) => new Intl.NumberFormat("ko-KR").format(value);

function priorityScore(hotel: Hotel) {
  const grade = hotel.grade === 5 ? 24 : 15;
  const scale = Math.min(22, hotel.rooms / 30);
  const zone = ["CBD", "GBD", "YBD"].includes(hotel.zone) ? 18 : 12;
  const deal = hotel.transaction ? 24 : 9;
  const confidence = hotel.coordinateConfidence === "address" ? 8 : 5;
  return Math.round(grade + scale + zone + deal + confidence);
}

export default function HotelExplorer() {
  const [grade, setGrade] = useState<GradeFilter>("all");
  const [zone, setZone] = useState("전체 권역");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Hotel | null>(hotels.find((hotel) => hotel.transaction) ?? hotels[0]);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return hotels
      .filter((hotel) => grade === "all" || (grade === "transaction" ? hotel.transaction : hotel.grade === grade))
      .filter((hotel) => zone === "전체 권역" || hotel.zone === zone)
      .filter((hotel) => !normalized || [hotel.name, hotel.address, hotel.district, hotel.brand].join(" ").toLowerCase().includes(normalized))
      .sort((a, b) => priorityScore(b) - priorityScore(a));
  }, [grade, zone, query]);

  const totalRooms = hotels.reduce((sum, hotel) => sum + hotel.rooms, 0);
  const transactionCount = hotels.filter((hotel) => hotel.transaction).length;

  const choose = useCallback((hotel: Hotel) => {
    setSelected(hotel);
  }, []);

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
          <span className="status-dot" /> 데이터 기준 2026.06.01
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

      <section className="workspace">
        <aside className={`asset-panel ${mobileView === "list" ? "mobile-on" : ""}`}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ASSET UNIVERSE</p>
              <h2>투자 검토 자산</h2>
            </div>
            <span>우선순위순</span>
          </div>
          <div className="asset-list">
            {filtered.map((hotel, index) => (
              <button key={hotel.id} className={`asset-card ${selected?.id === hotel.id ? "selected" : ""}`} onClick={() => choose(hotel)}>
                <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                <span className="card-main">
                  <span className="card-topline">
                    <span className={`grade-pill grade-${hotel.grade}`}>{hotel.grade}성</span>
                    <span>{hotel.zone}</span>
                    {hotel.transaction && <span className="deal-pill">DEAL</span>}
                  </span>
                  <strong>{hotel.name}</strong>
                  <span className="card-meta">{hotel.district} · {formatNumber(hotel.rooms)}실 · {hotel.brand}</span>
                </span>
                <span className="score"><b>{priorityScore(hotel)}</b><small>score</small></span>
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

        {selected && (
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
            </div>
            <div className="detail-metrics">
              <Metric label="객실수" value={`${formatNumber(selected.rooms)}실`} />
              <Metric label="브랜드군" value={selected.brand} />
              <Metric label="우선순위" value={`${priorityScore(selected)} / 100`} />
            </div>

            {selected.transaction ? (
              <div className="deal-box">
                <div className="section-title"><span>확인 거래</span><b>CONF. {selected.transaction.confidence}</b></div>
                <div className="deal-amount"><strong>{formatNumber(selected.transaction.amount)}</strong><span>억원</span></div>
                <div className="deal-grid">
                  <span>거래연도<b>{selected.transaction.year}</b></span>
                  <span>객실당<b>{formatNumber(selected.transaction.perKey)}억원</b></span>
                  <span>투자유형<b>{selected.transaction.theme}</b></span>
                </div>
                <p>{selected.transaction.buyer}</p>
              </div>
            ) : (
              <div className="no-deal-box">
                <span>공개 거래 미확인</span>
                <p>보유구조 및 최근 거래 여부를 등기·공시로 추가 확인해야 합니다.</p>
              </div>
            )}

            <div className="detail-section">
              <div className="section-title"><span>소유·구조</span><b>VERIFY</b></div>
              <p className="owner-line">{selected.owner}</p>
            </div>
            <div className="detail-section">
              <div className="section-title"><span>핵심 DD</span><b>01</b></div>
              <p>{selected.dd}</p>
            </div>
            <div className="detail-section source-note">
              <div className="section-title"><span>데이터 신뢰도</span><b>{selected.coordinateConfidence === "address" ? "HIGH" : "MID"}</b></div>
              <p>등급·객실·주소: 문화체육관광부 기준. 좌표: 공공 지오코딩. 소유권과 거래구조는 투자판단 전 원문 확인이 필요합니다.</p>
            </div>
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
    const resize = new ResizeObserver(() => map.invalidateSize({ animate: false }));
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
        .on("click", () => onSelect(hotel));
      marker.addTo(layer);
    });
  }, [visibleHotels, selected, onSelect]);

  useEffect(() => {
    if (!selected || !mapRef.current) return;
    const map = mapRef.current;
    if (!map.getBounds().pad(-0.2).contains([selected.lat, selected.lng])) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 12), { duration: 0.55 });
    }
  }, [selected]);

  return <div ref={containerRef} className="leaflet-map" aria-label="드래그와 확대·축소가 가능한 서울 호텔 지도" />;
}

function Kpi({ label, value, unit, tone = "" }: { label: string; value: string; unit: string; tone?: string }) {
  return <div className={`kpi ${tone}`}><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
