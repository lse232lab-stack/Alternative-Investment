import type { Hotel } from "./hotels";
import { buildingRegister } from "./buildingRegister";

export type SourceLink = { label: string; url: string; kind: "공식" | "공시·리서치" | "공공데이터" | "보조자료" };
export type NearbyNode = { name: string; category: string; distanceKm: number };
export type HotelProfile = {
  officialUrl: string;
  opening: string;
  renovation: string;
  facilities: string[];
  operator: string;
  ownershipNote: string;
  locationSummary: string;
  demandDrivers: string[];
  nearby: string[];
  nearbyNodes: NearbyNode[];
  physicalFacts: { label: string; value: string; status: "확인" | "보조자료" | "확인중" }[];
  buildingRegisterStatus: "확인" | "재매칭 필요";
  buildingRegisterNote: string;
  assetMetrics: { label: string; value: string; note: string }[];
  structureFacts: { label: string; value: string; status: "확인" | "확인중" }[];
  marketSignals: string[];
  verifiedCount: number;
  sources: SourceLink[];
};

type PhysicalOverride = { levels?: string; height?: string; start?: string; rooms?: string; osm: string };

const physicalOverrides: Record<string, PhysicalOverride> = {
  "SEL-002": { levels: "지상 23층", height: "84m", start: "1971년", osm: "https://www.openstreetmap.org/way/377289798" },
  "SEL-003": { levels: "지상 10층", height: "35.7m", osm: "https://www.openstreetmap.org/way/765964703" },
  "SEL-005": { levels: "지상 38층", height: "199m", start: "2012년", rooms: "434실", osm: "https://www.openstreetmap.org/way/500362301" },
  "SEL-006": { levels: "지상 17층", height: "62m", start: "2019년", osm: "https://www.openstreetmap.org/way/504510382" },
  "SEL-012": { levels: "지상 28층", height: "90m", start: "1971년", osm: "https://www.openstreetmap.org/way/233593644" },
  "SEL-017": { levels: "지상 25층", height: "101m", start: "2015년", osm: "https://www.openstreetmap.org/way/537163288" },
  "SEL-025": { levels: "지상 31층", height: "130m", start: "2021년", rooms: "호텔·레지던스 합계 563실", osm: "https://www.openstreetmap.org/way/503503952" },
  "SEL-029": { levels: "지상 20층", height: "80m", start: "2017년", osm: "https://www.openstreetmap.org/way/612473483" },
  "SEL-036": { levels: "지상 27층", height: "118m", start: "2002년", osm: "https://www.openstreetmap.org/way/74056398" },
  "SEL-042": { levels: "지상 28층", height: "101m", start: "2018년", osm: "https://www.openstreetmap.org/way/781587539" },
  "SEL-045": { levels: "지상 18층", height: "64.9m", start: "1963년 건물", osm: "https://www.openstreetmap.org/relation/15077072" },
  "SEL-046": { levels: "지상 25층", height: "95m", start: "2017년", osm: "https://www.openstreetmap.org/way/871868160" },
  "SEL-051": { levels: "지상 20층", height: "88m", start: "2016년", osm: "https://www.openstreetmap.org/way/708858343" },
  "SEL-052": { levels: "지상 8층", osm: "https://www.openstreetmap.org/way/358098017" },
  "SEL-057": { levels: "지상 22층", height: "87m", start: "1978년 건물", osm: "https://www.openstreetmap.org/way/233593619" },
  "SEL-058": { levels: "지상 37층", height: "150m", start: "1981년 건물", osm: "https://www.openstreetmap.org/way/117914845" },
  "SEL-063": { levels: "지상 8층", osm: "https://www.openstreetmap.org/way/273028085" },
  "SEL-066": { levels: "지상 14층", height: "51m", start: "1985년 건물", rooms: "250실", osm: "https://www.openstreetmap.org/way/619716472" },
  "SEL-068": { levels: "지상 24층", height: "101m", start: "2005년", osm: "https://www.openstreetmap.org/way/85032870" },
  "SEL-069": { levels: "지상 16층", start: "1979년 건물", osm: "https://www.openstreetmap.org/way/400821751" },
  "SEL-073": { levels: "지상 21층", height: "90m", start: "1971년 건물", osm: "https://www.openstreetmap.org/way/634096177" },
  "SEL-079": { rooms: "251실", osm: "https://www.openstreetmap.org/node/10572187165" },
  "SEL-082": { levels: "지상 27층", height: "95m", start: "2015년", osm: "https://www.openstreetmap.org/way/358300388" },
};

const structureOverrides: Record<string, string[]> = {
  "SEL-009": ["파르나스호텔 건물 소유", "토지는 임차", "Marriott 웨스틴 브랜드 운영"],
  "SEL-011": ["서울드래곤시티 복합호텔", "서부T&D·신한서부티엔디리츠 관련 자산", "Accor 브랜드 운영"],
  "SEL-030": ["서울드래곤시티 복합호텔", "서부T&D·신한서부티엔디리츠 관련 자산", "Accor 브랜드 운영"],
  "SEL-037": ["롯데리츠 직접 소유", "호텔롯데 책임임대차", "2024년 9월 편입"],
  "SEL-039": ["서울드래곤시티 복합호텔", "복합시설 공용부·운영구조 확인 필요", "Accor 브랜드 운영"],
  "SEL-047": ["서울드래곤시티 복합호텔", "리츠 보유분과 서부T&D 보유분 병존", "Accor 브랜드 운영"],
  "SEL-049": ["호텔신라 직영 호텔", "2013년 전면 리노베이션", "토지·건물 세부 등기 확인 필요"],
  "SEL-053": ["파르나스호텔 토지·건물 소유", "IHG 인터컨티넨탈 브랜드 운영", "COEX·파르나스몰 연계"],
  "SEL-071": ["파르나스호텔 위탁운영", "2023년 4월 개관", "소유주와 운영주체 분리"],
};

const locationNodes = [
  { name: "광화문·세종문화회관", category: "업무·관광", lat: 37.5716, lng: 126.9769 },
  { name: "서울시청", category: "업무", lat: 37.5663, lng: 126.9779 },
  { name: "명동 상권", category: "리테일·관광", lat: 37.5636, lng: 126.986 },
  { name: "동대문 DDP", category: "MICE·관광", lat: 37.5665, lng: 127.0092 },
  { name: "서울역", category: "광역교통", lat: 37.5547, lng: 126.9707 },
  { name: "용산역", category: "광역교통", lat: 37.5299, lng: 126.9648 },
  { name: "이태원 상권", category: "관광·F&B", lat: 37.5345, lng: 126.9946 },
  { name: "여의도 IFC", category: "오피스·MICE", lat: 37.5252, lng: 126.9255 },
  { name: "더현대서울", category: "리테일", lat: 37.5254, lng: 126.9284 },
  { name: "홍대입구역", category: "공항철도·관광", lat: 37.5572, lng: 126.9254 },
  { name: "COEX", category: "MICE·리테일", lat: 37.5125, lng: 127.0588 },
  { name: "강남역", category: "업무·교통", lat: 37.4979, lng: 127.0276 },
  { name: "잠실 롯데월드타워", category: "관광·MICE", lat: 37.5133, lng: 127.1028 },
  { name: "마곡나루역", category: "공항철도·업무", lat: 37.5669, lng: 126.8275 },
  { name: "김포공항", category: "항공교통", lat: 37.5587, lng: 126.7945 },
  { name: "서울식물원", category: "관광·공원", lat: 37.5683, lng: 126.8351 },
  { name: "구로디지털단지역", category: "업무·교통", lat: 37.4853, lng: 126.9015 },
  { name: "신도림역", category: "광역교통", lat: 37.5088, lng: 126.8913 },
] as const;

const officialByKeyword: Array<[string, string]> = [
  ["풀만 앰배서더 서울 이스트폴", "https://www.ambatel.com/pullman/seoul/kr/main.do"],
  ["코리아나", "https://www.koreanahotel.com/"], ["호텔 PJ", "https://www.hotelpj.co.kr/"],
  ["호텔 나루", "https://www.hotelnaruseoul.com/"], ["콘래드", "https://conradseoul.co.kr/hub/ko/main.do"],
  ["안다즈", "https://www.hyatt.com/andaz/ko-KR/selaz-andaz-seoul-gangnam"],
  ["메리엇 이그제큐티브", "https://www.marriott.com/en-us/hotels/seler-marriott-executive-apartments-seoul/overview/"],
  ["아난티", "https://ananti.kr/"], ["웨스틴 서울 파르나스", "https://www.marriott.com/ko/hotels/selwg-the-westin-seoul-parnas/overview/"],
  ["클래식 500", "https://www.pentaz.co.kr/"], ["프레지던트", "https://www.hotelpresident.co.kr/"],
  ["글래드", "https://www.glad-hotels.com/"], ["아만티", "https://www.hotelamanti.com/"],
  ["포시즌스", "https://www.fourseasons.com/kr/seoul/"], ["라마다 서울 신도림", "http://www.ramadasindorim.com/main"],
  ["보코서울강남", "https://www.ihg.com/voco/hotels/kr/ko/seoul/selvo/hoteldetail"],
  ["voco 서울 명동", "https://www.ihg.com/voco/hotels/kr/ko/seoul/selpm/hoteldetail"],
  ["힐튼 가든", "https://www.hilton.com/en/hotels/selgigi-hilton-garden-inn-seoul-gangnam/"],
  ["골든서울", "https://www.goldenseoul.com/"], ["메이필드", "https://www.mayfield.co.kr/"],
  ["소피텔", "https://www.sofitel-seoul.com/"], ["호텔리베라", "https://www.hotelriviera.co.kr/"],
  ["워커힐", "https://www.walkerhill.com/"], ["반얀트리", "https://www.banyantree.com/south-korea/club-and-spa-seoul"],
  ["오크우드", "http://www.oakwoodpremier.co.kr/opcc"], ["서울가든", "https://www.seoulgarden.co.kr/"],
  ["스탠포드", "https://www.stanfordseoul.com/"], ["레스케이프", "https://www.lescapehotel.com/"],
  ["프레이저", "https://www.frasershospitality.com/en/south-korea/seoul/"],
  ["앰배서더 서울 풀만", "https://www.ambatel.com/theambassador/seoul/kr/main.do"],
  ["신라스테이", "https://www.shillastay.com/"], ["서울신라", "https://www.shilla.net/seoul/"],
  ["몬드리안", "https://mondrianhotels.com/seoul-itaewon/"], ["알로프트", "https://www.marriott.com/en-us/hotels/selal-aloft-seoul-myeongdong/overview/"],
  ["그랜드 인터컨티넨탈", "https://seoul.intercontinental.com/"], ["오라카이", "https://www.orakaihotels.com/hub/kr/default.asp"],
  ["페어몬트", "https://www.fairmont.com/seoul/"], ["더 플라자", "https://www.hoteltheplaza.com/"],
  ["퍼시픽", "https://www.thepacifichotel.co.kr/"], ["스위스그랜드", "https://www.swissgrand.co.kr/"],
  ["파크하얏트", "https://www.hyatt.com/park-hyatt/ko-KR/selph-park-hyatt-seoul"], ["삼정", "https://www.samjunghotel.co.kr/"],
  ["나인트리", "https://www.ninetreehotels.com/"], ["시그니엘", "https://www.lottehotel.com/seoul-signiel/ko"],
  ["로얄호텔", "https://www.royal.co.kr/"], ["켄싱턴", "https://www.kensington.co.kr/"],
  ["스카이파크", "https://www.skyparkhotel.com/"], ["소테츠", "https://sotetsu-hotels.com/splaisir/seoul-myeong-dong/"],
  ["머큐어 앰배서더 서울 홍대", "https://www.ambatel.com/mercure/hongdae/ko/main.do"],
  ["머큐어 서울 마곡", "https://all.accor.com/hotel/B9P8/index.ko.shtml"],
  ["노보텔앰배서더서울동대문", "https://www.ambatel.com/novotel/dongdaemun/ko/main.do"],
];

const opening: Record<string, [string, string]> = {
  "SEL-002": ["1971년", "공개 건축정보(OSM)"], "SEL-005": ["2012년", "공개 건축정보·호텔 자료"],
  "SEL-006": ["2019년", "호텔 공개자료"], "SEL-009": ["2025년 9월 웨스틴 전환 개관", "파르나스호텔 공시·리서치"],
  "SEL-012": ["1971년", "공개 건축정보(OSM)"], "SEL-014": ["2016년", "공개 건축정보(OSM)"],
  "SEL-017": ["2015년", "호텔 공개자료"], "SEL-021": ["2021년", "호텔 공개자료"],
  "SEL-025": ["2021년", "호텔 공개자료"], "SEL-031": ["2015년 5월", "신세계그룹 공식 뉴스룸"],
  "SEL-037": ["2017년", "롯데리츠 공시자료"], "SEL-040": ["2018년", "호텔 공개자료"],
  "SEL-042": ["2018년", "호텔 공개자료"], "SEL-046": ["2017년", "공개 건축정보(OSM)"],
  "SEL-045": ["1955년 창업·2022년 재개관", "앰배서더 호텔 그룹"],
  "SEL-053": ["1988년 8월", "파르나스호텔 공시·리서치"], "SEL-064": ["2017년", "공개 건축정보(OSM)"],
  "SEL-068": ["2005년", "호텔 공개자료"], "SEL-071": ["2023년 4월", "파르나스호텔 공시·리서치"],
  "SEL-079": ["2018년", "호텔 공개자료"], "SEL-080": ["2016년", "공개 건축정보(OSM)"],
  "SEL-082": ["2015년", "공개 건축정보(OSM)"],
};

const renovation: Record<string, string> = {
  "SEL-009": "기존 인터컨티넨탈 코엑스를 전면 개조해 2025년 웨스틴으로 재개관",
  "SEL-019": "2018년 대규모 리노베이션 후 재개관",
  "SEL-034": "구 타워호텔을 복원·전환해 2010년 개관",
  "SEL-045": "대규모 리노베이션 후 2022년 재개관",
  "SEL-049": "2013년 전면 리노베이션",
  "SEL-053": "2020년 전면 리노베이션 완료",
  "SEL-057": "2010년 전면 리노베이션 및 브랜드 재정립",
  "SEL-060": "2021~2022년 객실 중심 대규모 리뉴얼",
};

const zoneInfo: Record<string, { summary: string; drivers: string[]; nearby: string[] }> = {
  CBD: { summary: "광화문·시청·명동·동대문 축의 업무·관광·쇼핑 수요를 함께 흡수하는 서울 핵심 도심권.", drivers: ["대기업·공공기관 업무수요", "명동·고궁 관광", "도심 철도 접근성"], nearby: ["광화문·시청", "명동 상권", "경복궁·덕수궁"] },
  GBD: { summary: "테헤란로·코엑스·강남대로를 중심으로 기업체·MICE·럭셔리 소비 수요가 중첩되는 권역.", drivers: ["테헤란로 기업수요", "COEX MICE", "압구정·청담 상권"], nearby: ["COEX·봉은사", "테헤란로", "강남역·청담"] },
  YBD: { summary: "금융회사와 국회, 대형 복합상업시설이 밀집한 여의도 업무권역으로 주중 법인수요가 강함.", drivers: ["금융·증권 법인수요", "IFC·더현대서울", "한강·콘텐츠 행사"], nearby: ["IFC Seoul", "더현대서울", "여의도공원·한강"] },
  "용산·이태원": { summary: "서울역·용산역 광역교통과 이태원 관광, 대형 복합개발 기대가 결합된 성장 권역.", drivers: ["KTX·공항철도", "용산 국제업무지구", "이태원 외래관광"], nearby: ["서울역·용산역", "용산공원", "이태원 상권"] },
  "서북·홍대": { summary: "홍대 문화상권과 마포 업무지구, 공항철도 접근성을 기반으로 외래 개별여행 수요가 강한 권역.", drivers: ["홍대 관광·야간상권", "공항철도", "마포 업무수요"], nearby: ["홍대입구", "연남·합정", "마포대로"] },
  "마곡·김포공항": { summary: "마곡 R&D 업무지구와 김포공항 항공수요, 서울식물원 레저수요가 결합된 서부 업무권역.", drivers: ["마곡 기업·R&D", "김포공항", "서울식물원"], nearby: ["마곡나루역", "LG사이언스파크", "김포공항"] },
  동서울: { summary: "잠실·광진·강동 생활권의 스포츠·공연·레저 및 동부 업무수요를 흡수하는 권역.", drivers: ["잠실 MICE·스포츠", "롯데월드·한강", "동부권 비즈니스"], nearby: ["잠실·롯데월드", "한강", "건대·강변"] },
  서남: { summary: "구로·신도림 디지털 업무지구와 서남권 광역교통을 기반으로 한 비즈니스형 수요 권역.", drivers: ["G밸리 기업수요", "신도림 환승", "서남권 산업단지"], nearby: ["구로디지털단지", "신도림역", "타임스퀘어"] },
  기타: { summary: "도심 주요 수요권과 연결되는 서울 생활권 입지로, 개별 자산별 수요발생원 확인이 중요함.", drivers: ["지역 업무수요", "생활형 상권", "도심 접근성"], nearby: ["주요 지하철역", "지역 상권", "업무시설"] },
};

const transactionSources: Record<string, string> = {
  "SEL-005": "https://news.nate.com/view/20241111n30304",
  "SEL-031": "https://www.corebeat.co.kr/article/582",
  "SEL-037": "https://www.hankyung.com/amp/202408266883r",
  "SEL-080": "https://www.newspim.com/news/view/20250630000291",
  "SEL-067": "https://v.daum.net/v/20260206094703161",
};

const marketSignalsByZone: Record<string, string[]> = {
  CBD: ["주중 법인·공공 수요와 주말 외래관광 수요가 혼합", "명동·광화문·동대문 내부에서도 상권별 ADR 포지셔닝 차이 큼", "노후 자산은 객실보다 설비·외장·연회장 CAPEX 검토가 중요"],
  GBD: ["테헤란로 기업체와 COEX MICE 캘린더가 객실 수요를 견인", "럭셔리·상위 업스케일 공급이 집중되어 브랜드 경쟁 강도 높음", "청담·압구정 접근성은 레저·F&B 매출의 보조 수요원"],
  YBD: ["금융권 중심의 평일 객실 및 연회 수요가 핵심", "IFC·더현대서울·한강 이벤트가 주말 수요를 보완", "오피스 복합자산은 공용부 비용과 주차·동선 배분 확인 필요"],
  "용산·이태원": ["KTX·공항철도·도심 접근성이 광역 수요를 형성", "용산 국제업무지구 개발은 중장기 수요와 경쟁공급 모두에 영향", "복합호텔은 브랜드별 공용시설 및 비용배분 구조가 핵심"],
  "서북·홍대": ["공항철도 기반 외래 개별여행객 비중이 높은 권역", "홍대 야간상권과 콘텐츠 수요가 주말 실적을 지지", "객실당 거래가 분석 시 리테일 복합부분 포함 여부 구분 필요"],
  "마곡·김포공항": ["R&D 기업 장기체류와 김포공항 환승 수요가 기초수요", "신규 업무시설 입주속도와 호텔 공급 파이프라인 동시 확인 필요", "도심 호텔보다 주중·주말 실적 편차가 커질 수 있음"],
  동서울: ["잠실 MICE·스포츠·공연 일정이 단기 피크 수요를 형성", "광진·강동권은 한강 레저 및 지역 생활수요가 보완", "대규모 복합개발과 교통계획이 중장기 경쟁구도에 영향"],
  서남: ["G밸리 법인수요와 신도림 환승수요 중심의 비즈니스 시장", "객실 단가보다 가동률·기업계약 확보력이 중요", "대형 리테일·공연시설 인접 여부가 주말 수요를 좌우"],
  기타: ["개별 호텔별 핵심 수요 발생원과 경쟁군 재설정 필요", "도심 접근시간과 실제 대중교통 동선 확인 필요", "지역 내 신규 공급 및 용도전환 계획 확인 필요"],
};

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestNodes(hotel: Hotel): NearbyNode[] {
  return locationNodes
    .map((node) => ({ name: node.name, category: node.category, distanceKm: distanceKm(hotel.lat, hotel.lng, node.lat, node.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 4);
}

function officialUrl(hotel: Hotel) {
  const hit = officialByKeyword.find(([keyword]) => hotel.name.includes(keyword));
  if (hit) return hit[1];
  if (/롯데호텔|L7 |롯데시티/.test(hotel.name)) return "https://www.lottehotel.com/";
  if (/JW|코트야드|포포인츠|AC호텔|더 링크/.test(hotel.name)) return "https://www.marriott.com/ko/";
  if (/노보텔|이비스|그랜드 머큐어/.test(hotel.name)) return "https://www.ambatel.com/ko/main.do";
  if (/조선 팰리스|웨스틴 조선/.test(hotel.name)) return "https://josunhotel.com/";
  return "https://korean.visitkorea.or.kr/";
}

function facilitiesFor(hotel: Hotel) {
  const items = ["레스토랑·바", "피트니스", "연회·미팅"];
  if (hotel.grade === 5 || /메이필드|워커힐|소피텔|노보텔|오크우드|프레이저|클래식 500/.test(hotel.name)) items.push("수영장");
  if (hotel.grade === 5 || /반얀트리|아난티|오라카이|프레이저/.test(hotel.name)) items.push("스파·사우나");
  if (/레지던스|스위트|이그제큐티브|오크우드|프레이저|클래식 500/.test(hotel.name)) items.push("장기체류·주방 시설");
  return items;
}

const formatArea = (value: number | null) => value == null ? "대장 기재 없음" : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}㎡`;
const formatRatio = (value: number | null) => value == null ? "대장 기재 없음" : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
const formatCount = (value: number | null, unit: string) => value == null ? "대장 기재 없음" : `${value.toLocaleString("ko-KR")} ${unit}`;
const formatFloors = (above: number | null, below: number | null) => {
  if (above == null && below == null) return "대장 기재 없음";
  return [above == null ? null : `지상 ${above}층`, below == null ? null : `지하 ${below}층`].filter(Boolean).join(" · ");
};

export function getHotelProfile(hotel: Hotel): HotelProfile {
  const area = zoneInfo[hotel.zone] ?? zoneInfo.기타;
  const url = officialUrl(hotel);
  const baseSources: SourceLink[] = [
    { label: "호텔 공식 홈페이지 · 객실/시설", url, kind: "공식" },
    { label: "문화체육관광부 관광숙박업 등록·등급 데이터", url: "https://www.data.go.kr/", kind: "공공데이터" },
  ];
  if (transactionSources[hotel.id]) baseSources.push({ label: "거래 보도·시장자료", url: transactionSources[hotel.id], kind: "공시·리서치" });
  if (["SEL-009", "SEL-053", "SEL-071"].includes(hotel.id)) baseSources.push({ label: "파르나스호텔 공개 리서치", url: "https://consensus.hankyung.com/analysis/downpdf?report_idx=648684", kind: "공시·리서치" });
  if (hotel.id === "SEL-045") baseSources.push({ label: "앰배서더 서울 풀만 2022 리노베이션 공지", url: "https://www.ambatel.com/ko/about/newsView.do?hotel_code=H3706&page=1&prod_id=2912", kind: "공식" });
  const physical = physicalOverrides[hotel.id];
  if (physical) baseSources.push({ label: "OpenStreetMap 건물·호텔 보조정보", url: physical.osm, kind: "보조자료" });
  const ledger = buildingRegister[hotel.id as keyof typeof buildingRegister];
  if (ledger) baseSources.push({ label: `건축HUB 건축물대장 · ${ledger.ledgerScope}`, url: "https://www.data.go.kr/data/15134735/openapi.do", kind: "공공데이터" });
  if (["SEL-011", "SEL-030", "SEL-039", "SEL-047"].includes(hotel.id)) baseSources.push({ label: "서부T&D 서울드래곤시티 IR 자료", url: "https://kind.krx.co.kr/external/dst/irReference/17422/%EC%84%9C%EB%B6%80T%26D%20%ED%9A%8C%EC%82%AC%EC%86%8C%EA%B0%9C%EC%9E%90%EB%A3%8C_202508_v2.pdf", kind: "공시·리서치" });
  if (hotel.id === "SEL-037") baseSources.push({ label: "롯데리츠 사업보고서 · L7 강남", url: "https://kind.krx.co.kr/external/2026/03/03/001104/20260303003018/00591.htm", kind: "공시·리서치" });
  if (hotel.id === "SEL-049") baseSources.push({ label: "호텔신라 공시 · 서울호텔 리노베이션", url: "https://kind.krx.co.kr/external/2026/04/10/001082/20260410002474/10002.htm", kind: "공시·리서치" });
  const open = opening[hotel.id];
  const structure = structureOverrides[hotel.id];
  const ledgerFact = (label: string, value: string, available: boolean) => ({ label, value, status: available ? "확인" as const : "확인중" as const });
  const physicalFacts = ledger ? [
    { label: "등록 객실", value: `${hotel.rooms.toLocaleString("ko-KR")}실`, status: "확인" as const },
    ledgerFact("사용승인일", ledger.approvalDate ?? "대장 기재 없음", ledger.approvalDate != null),
    ledgerFact("대지면적", formatArea(ledger.siteArea), ledger.siteArea != null),
    ledgerFact("건축면적", formatArea(ledger.buildingArea), ledger.buildingArea != null),
    ledgerFact("연면적", formatArea(ledger.totalArea), ledger.totalArea != null),
    ledgerFact("건폐율", formatRatio(ledger.coverageRatio), ledger.coverageRatio != null),
    ledgerFact("용적률", formatRatio(ledger.floorAreaRatio), ledger.floorAreaRatio != null),
    ledgerFact("층수", formatFloors(ledger.floorsAbove, ledger.floorsBelow), ledger.floorsAbove != null || ledger.floorsBelow != null),
    ledgerFact("높이", ledger.height == null ? "대장 기재 없음" : `${ledger.height.toLocaleString("ko-KR")}m`, ledger.height != null),
    ledgerFact("구조", ledger.structure ?? "대장 기재 없음", ledger.structure != null),
    ledgerFact("주용도", ledger.mainPurpose ?? "대장 기재 없음", ledger.mainPurpose != null),
    ledgerFact("주차", formatCount(ledger.parking, "대"), ledger.parking != null),
    ledgerFact("승강기", ledger.passengerElevators == null && ledger.emergencyElevators == null ? "대장 기재 없음" : `승용 ${ledger.passengerElevators ?? 0}대 · 비상 ${ledger.emergencyElevators ?? 0}대`, ledger.passengerElevators != null || ledger.emergencyElevators != null),
    ledgerFact("내진설계", [ledger.seismicApplied, ledger.seismicCapacity].filter(Boolean).join(" · ") || "대장 기재 없음", ledger.seismicApplied != null || ledger.seismicCapacity != null),
    { label: "자산 구성", value: hotel.assetType, status: "확인" as const },
  ] : [
    { label: "등록 객실", value: `${hotel.rooms.toLocaleString("ko-KR")}실`, status: "확인" as const },
    { label: "층수", value: physical?.levels ?? "주소·필지 재매칭 필요", status: physical?.levels ? "보조자료" as const : "확인중" as const },
    { label: "건물 높이", value: physical?.height ?? "주소·필지 재매칭 필요", status: physical?.height ? "보조자료" as const : "확인중" as const },
    { label: "건축물대장", value: "주소·필지 재매칭 필요", status: "확인중" as const },
    { label: "자산 구성", value: hotel.assetType, status: "확인" as const },
  ];
  const approvalYear = ledger?.approvalDate ? Number(ledger.approvalDate.slice(0, 4)) : null;
  const hotelOnlyScope = ledger?.hotelUseMatched && ledger.candidateCount.titles === 1 && ledger.candidateCount.recaps === 0;
  const assetMetrics = ledger ? [
    { label: "준공 경과", value: approvalYear ? `${2026 - approvalYear}년` : "산정 불가", note: "2026년 기준·사용승인연도 단순 차감" },
    { label: "객실당 연면적", value: hotelOnlyScope && ledger.totalArea ? `${(ledger.totalArea / hotel.rooms).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡` : "범위 확인 필요", note: hotelOnlyScope ? "대장 연면적 ÷ 등록 객실수" : "복합자산 전체면적 배분 전 미산정" },
    { label: "객실당 주차", value: hotelOnlyScope && ledger.parking != null ? `${(ledger.parking / hotel.rooms).toFixed(2)}대` : "범위 확인 필요", note: hotelOnlyScope ? "대장 주차대수 ÷ 등록 객실수" : "복합자산 주차 배분 전 미산정" },
  ] : [];
  const buildingRegisterStatus = ledger ? "확인" as const : "재매칭 필요" as const;
  const buildingRegisterNote = !ledger
    ? "도로명주소는 확인됐지만 건축물대장 표제부가 자동 매칭되지 않았습니다. 본번·부번 및 복합건축물 동명을 재확인해야 합니다."
    : hotelOnlyScope
      ? `${ledger.buildingName ? `${ledger.buildingName} · ` : ""}${ledger.ledgerScope} 기준입니다. 공공데이터 수집일 ${ledger.fetchedAt.slice(0, 10)}.`
      : ledger.hotelUseMatched
        ? `복합건축물 ${ledger.buildingName ?? "표제부"} 기준입니다. 면적·주차는 대장상 건물 또는 대지 전체 수치일 수 있어 호텔 귀속분을 별도 확인해야 합니다.`
      : `복합건축물 ${ledger.buildingName ?? "표제부"} 기준입니다. 주용도가 숙박시설로 직접 식별되지 않아 호텔 전용면적·공용부 배분을 별도 확인해야 합니다.`;
  const structureFacts = structure
    ? structure.map((value, index) => ({ label: ["소유구조", "계약·보유", "운영구조"][index] ?? "구조", value, status: "확인" as const }))
    : [
        { label: "현재 파악 소유주", value: hotel.owner, status: hotel.owner.includes("미확인") ? "확인중" as const : "확인" as const },
        { label: "운영 브랜드", value: hotel.brand, status: "확인" as const },
        { label: "계약 형태", value: "직영·임차·HMA·프랜차이즈 구분 확인 중", status: "확인중" as const },
      ];
  const verifiedCount = physicalFacts.filter((fact) => fact.status !== "확인중").length + structureFacts.filter((fact) => fact.status === "확인").length + baseSources.length;
  return {
    officialUrl: url,
    opening: ledger?.approvalDate ? `사용승인 ${ledger.approvalDate} · 건축물대장` : open ? `${open[0]} · ${open[1]}` : "공식 홈페이지·건축물대장 추가 확인 중",
    renovation: renovation[hotel.id] ?? "공개된 주요 리모델링 이력 미확인",
    facilities: facilitiesFor(hotel),
    operator: hotel.brand,
    ownershipNote: hotel.owner.includes("미확인") ? "법인·펀드·토지/건물 소유 분리를 등기 및 공시 원문으로 확인 필요" : `${hotel.owner} · 자산/운영계약 범위는 원문 확인 필요`,
    locationSummary: area.summary,
    demandDrivers: area.drivers,
    nearby: area.nearby,
    nearbyNodes: nearestNodes(hotel),
    physicalFacts,
    buildingRegisterStatus,
    buildingRegisterNote,
    assetMetrics,
    structureFacts,
    marketSignals: marketSignalsByZone[hotel.zone] ?? marketSignalsByZone.기타,
    verifiedCount,
    sources: baseSources,
  };
}
