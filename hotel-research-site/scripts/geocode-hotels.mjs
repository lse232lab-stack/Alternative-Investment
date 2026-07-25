import fs from "node:fs/promises";

const csvPath = new URL("../data/hotels.csv", import.meta.url);
const cachePath = new URL("../data/geocode-cache.json", import.meta.url);
const outputPath = new URL("../app/hotels.ts", import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ""; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift();
  return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

function districtOf(address) {
  return address.match(/(?:서울특별시|서울)\s*([가-힣]+구)/)?.[1] ?? "확인 필요";
}

function zoneOf(district) {
  if (["중구", "종로구"].includes(district)) return "CBD";
  if (["강남구", "서초구", "송파구"].includes(district)) return "GBD";
  if (district === "영등포구") return "YBD";
  if (district === "용산구") return "용산·이태원";
  if (["마포구", "서대문구"].includes(district)) return "서북·홍대";
  if (district === "강서구") return "마곡·김포공항";
  if (["광진구", "성동구", "동대문구"].includes(district)) return "동서울";
  if (["구로구", "금천구"].includes(district)) return "서남";
  return "기타";
}

const normalizedNames = {
  "호텔롯데": "롯데호텔 서울",
  "(주)조선호텔앤리조트": "웨스틴 조선 서울",
  "(주)호텔신라": "서울신라호텔",
  "플라자호텔": "더 플라자 서울",
  "호텔 오크우드 프리미어": "오크우드 프리미어 코엑스 센터",
  "보코 언 아이에이치지 호텔": "voco 서울 명동",
  "(주)서울가든": "서울가든호텔",
  "앰배서더서울풀만호텔": "앰배서더 서울 풀만",
  "(주)호텔롯데 L7홍대": "L7 홍대",
  "(주)호텔롯데 L7강남": "L7 강남",
  "㈜호텔롯데 L7명동": "L7 명동",
  "㈜호텔롯데 롯데시티호텔 명동": "롯데시티호텔 명동",
  "SK 네트웍스 (주) 워커힐-그랜드 워커힐": "그랜드 워커힐 서울",
  "SK 네트웍스 (주) 워커힐 - 비스타 워커힐": "비스타 워커힐 서울",
  "(주)조선호텔앤리조트 레스케이프": "레스케이프 호텔",
  "(주)조선호텔앤리조트 포포인츠 조선 서울역": "포포인츠 바이 쉐라톤 조선 서울역",
  "(주)조선호텔앤리조트 조선팰리스강남": "조선 팰리스 서울 강남",
  "(주)동승 JW메리어트 동대문 스퀘어 서울": "JW 메리어트 동대문 스퀘어 서울",
  "(주)서부티엔디 이비스 스타일 앰배서더 서울 용산": "이비스 스타일 앰배서더 서울 용산",
  "(주)서부티엔디 노보텔 앰배서더 서울 용산": "노보텔 앰배서더 서울 용산",
  "(주)서부티엔디 노보텔 스위트 앰배서더 서울 용산": "노보텔 스위트 앰배서더 서울 용산",
  "(주)서부티엔디 그랜드 머큐어 앰배서더 서울 용산": "그랜드 머큐어 앰배서더 서울 용산",
  "소피텔 앰배서더 서울 호텔 앤 서비스드 레지던스(관광호텔)": "소피텔 앰배서더 서울",
  "글래드호텔앤리조트(주) 글래드호텔 여의도": "글래드 여의도",
  "스탠포드호텔코리아(주) 스탠포드호텔서울": "스탠포드호텔 서울",
  "금보개발(주) 오라카이 청계산 호텔": "오라카이 청계산 호텔",
  "호텔스카이파크 킹스타운동대문지점": "호텔 스카이파크 킹스타운 동대문",
};

function nameOf(name) { return normalizedNames[name] ?? name.replace(/^\(주\)/, "").trim(); }

function brandOf(name) {
  const n = name.toLowerCase();
  if (/콘래드|힐튼/.test(n)) return "Hilton";
  if (/인터컨티넨탈|보코|voco/.test(n)) return "IHG";
  if (/메리어트|포포인츠|웨스틴|조선 팰리스|레스케이프|코트야드|ac호텔/.test(n)) return "Marriott·조선";
  if (/하얏트|안다즈/.test(n)) return "Hyatt";
  if (/소피텔|노보텔|머큐어|이비스|엠갤러리|풀만|몬드리안|호텔 나루/.test(n)) return "Accor·앰배서더";
  if (/롯데|시그니엘|l7/.test(n)) return "롯데";
  if (/신라/.test(n)) return "신라";
  if (/워커힐/.test(n)) return "워커힐";
  if (/글래드/.test(n)) return "GLAD";
  return "독립·기타";
}

const transactions = {
  "콘래드 서울 호텔": { amount: 4150, year: 2024, buyer: "ARA Korea 운용 부동산펀드", theme: "글로벌 운영형", confidence: "B", dd: "IFC 공용부·HMA·선순위 대출 구조" },
  "L7 강남": { amount: 3300, year: 2024, buyer: "롯데리츠", theme: "스폰서 리츠", confidence: "A", dd: "호텔롯데 임대차·복합자산 NOI 배분" },
  "포포인츠 바이 쉐라톤 조선 서울역": { amount: 1720, year: 2025, buyer: "KB자산운용", theme: "Core+ 책임임차", confidence: "B", dd: "2035년 임대차·보증·PIP" },
  "머큐어 앰배서더 서울 홍대": { amount: 2620, year: 2025, buyer: "Goldman Sachs 주요 투자 구조", theme: "복합 Value-add", confidence: "B", dd: "호텔 운영계약·무신사 임대차·대출" },
  "voco 서울 명동": { amount: 2282, year: 2024, buyer: "Gravity AMC·TPG Angelo Gordon 관련", theme: "리포지셔닝", confidence: "C", dd: "브랜드 전환 CAPEX·PIP·안정화 실적" },
  "스위스그랜드호텔서울": { amount: 3208, year: 2025, buyer: "홍제353PFV 관련", theme: "개발형", confidence: "C", dd: "인허가·명도·호텔 존치가치 비교" },
};

const districtCenters = {
  "중구": [37.5641, 126.9979], "종로구": [37.5735, 126.9788], "강남구": [37.5172, 127.0473],
  "서초구": [37.4837, 127.0324], "송파구": [37.5145, 127.1059], "영등포구": [37.5264, 126.8962],
  "용산구": [37.5326, 126.9905], "마포구": [37.5663, 126.9015], "서대문구": [37.5791, 126.9368],
  "강서구": [37.5509, 126.8495], "광진구": [37.5385, 127.0823], "구로구": [37.4955, 126.8877],
};

let cache = {};
try { cache = JSON.parse(await fs.readFile(cachePath, "utf8")); } catch {}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function locate(address, name, index) {
  if (cache[address]) return cache[address];
  try {
    const query = new URLSearchParams({
      SingleLine: `${name}, ${address}`,
      f: "json",
      maxLocations: "1",
      countryCode: "KOR",
      outFields: "Match_addr,Addr_type",
    });
    const response = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?${query}`);
    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (candidate?.location && candidate.score >= 75) {
      cache[address] = {
        lat: Number(candidate.location.y),
        lng: Number(candidate.location.x),
        confidence: candidate.score >= 90 ? "address" : "approximate",
      };
    }
  } catch {}
  if (!cache[address]) {
    const district = districtOf(address);
    const center = districtCenters[district] ?? [37.5665, 126.9780];
    const offset = ((index % 9) - 4) * 0.0014;
    cache[address] = { lat: center[0] + offset, lng: center[1] - offset * 0.7, confidence: "district" };
  }
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
  await sleep(1100);
  return cache[address];
}

const raw = parseCsv(await fs.readFile(csvPath, "utf8"));
const selected = raw.filter((r) => r["지역"] === "서울" && ["4성", "5성"].includes(r["결정 등급"]));
const hotels = [];
for (let i = 0; i < selected.length; i++) {
  const r = selected[i];
  const name = nameOf(r["호텔명"]);
  const district = districtOf(r["주소"]);
  const position = await locate(r["주소"], name, i);
  const tx = transactions[name];
  const officialRooms = Number(r["객실수"]) || 0;
  const rooms = name === "앰배서더 서울 풀만" ? 269 : name === "웨스틴 서울 파르나스" ? 564 : officialRooms;
  hotels.push({
    id: `SEL-${String(i + 1).padStart(3, "0")}`,
    name, officialName: r["호텔명"], grade: Number(r["결정 등급"][0]), gradeDate: r["등급 결정일"],
    rooms, officialRooms, address: r["주소"], district, zone: zoneOf(district), brand: brandOf(name),
    lat: position.lat, lng: position.lng, coordinateConfidence: position.confidence,
    transaction: tx ? { ...tx, perKey: Number((tx.amount / rooms).toFixed(2)) } : null,
    owner: tx?.buyer ?? (/롯데호텔 서울|롯데호텔월드|시그니엘|L7 홍대|L7 명동|롯데시티/.test(name) ? "호텔롯데 계열(등기 확인 필요)" : /서울신라호텔/.test(name) ? "호텔신라(등기 확인 필요)" : /워커힐/.test(name) ? "SK네트웍스(등기 확인 필요)" : /인터컨티넨탈|웨스틴 서울 파르나스/.test(name) ? "파르나스호텔 계열(등기 확인 필요)" : "미확인(등기 확인 필요)"),
    assetType: /청파로20길 95/.test(r["주소"]) ? "멀티브랜드 복합" : /콘래드|페어몬트|소피텔|L7 강남|머큐어 앰배서더 서울 홍대|타임스퀘어|오크우드|프레이저|메리엇 이그제큐티브/.test(name) ? "복합자산" : "단독형",
    dd: tx?.dd ?? "등기·운영계약·최근 CAPEX·NOI 확보",
  });
  console.log(`${i + 1}/${selected.length} ${name} ${position.confidence}`);
}

const header = `export type Hotel = {\n  id: string; name: string; officialName: string; grade: number; gradeDate: string; rooms: number; officialRooms: number; address: string; district: string; zone: string; brand: string; lat: number; lng: number; coordinateConfidence: string; owner: string; assetType: string; dd: string; transaction: null | { amount: number; year: number; buyer: string; theme: string; confidence: string; dd: string; perKey: number };\n};\n\n`;
await fs.writeFile(outputPath, `${header}export const hotels: Hotel[] = ${JSON.stringify(hotels, null, 2)};\n`);
console.log(`Wrote ${hotels.length} hotels to ${outputPath.pathname}`);
