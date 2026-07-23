import type { Hotel } from "./hotels";

export type SourceLink = { label: string; url: string; kind: "공식" | "공시·리서치" | "공공데이터" | "보조자료" };
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
  sources: SourceLink[];
};

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
  const open = opening[hotel.id];
  return {
    officialUrl: url,
    opening: open ? `${open[0]} · ${open[1]}` : "공식 홈페이지·건축물대장 추가 확인 중",
    renovation: renovation[hotel.id] ?? "공개된 주요 리모델링 이력 미확인",
    facilities: facilitiesFor(hotel),
    operator: hotel.brand,
    ownershipNote: hotel.owner.includes("미확인") ? "법인·펀드·토지/건물 소유 분리를 등기 및 공시 원문으로 확인 필요" : `${hotel.owner} · 자산/운영계약 범위는 원문 확인 필요`,
    locationSummary: area.summary,
    demandDrivers: area.drivers,
    nearby: area.nearby,
    sources: baseSources,
  };
}
