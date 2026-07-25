import fs from "node:fs/promises";
import { inflateRawSync } from "node:zlib";

const env = Object.fromEntries((await fs.readFile(".env.local", "utf8"))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.includes("="))
  .map((line) => {
    const index = line.indexOf("=");
    const raw = line.slice(index + 1).trim();
    return [line.slice(0, index).trim(), raw.replace(/^(["'])(.*)\1$/, "$2")];
  }));

for (const key of ["DART_API_KEY", "RTMS_SERVICE_KEY", "SEOUL_OPEN_DATA_API_KEY"]) {
  if (!env[key]) throw new Error(`${key} is missing from .env.local`);
}

const hotelSource = await fs.readFile("app/hotels.ts", "utf8");
const hotelMatch = hotelSource.match(/export const hotels:[^=]+=\s*(\[[\s\S]*\]);/);
if (!hotelMatch) throw new Error("Could not parse app/hotels.ts");
const hotels = JSON.parse(hotelMatch[1]);

const districtCodes = {
  "종로구": { rtms: "11110", population: "11010" }, "중구": { rtms: "11140", population: "11020" },
  "용산구": { rtms: "11170", population: "11030" }, "성동구": { rtms: "11200", population: "11040" },
  "광진구": { rtms: "11215", population: "11050" }, "동대문구": { rtms: "11230", population: "11060" },
  "중랑구": { rtms: "11260", population: "11070" }, "성북구": { rtms: "11290", population: "11080" },
  "강북구": { rtms: "11305", population: "11090" }, "도봉구": { rtms: "11320", population: "11100" },
  "노원구": { rtms: "11350", population: "11110" }, "은평구": { rtms: "11380", population: "11120" },
  "서대문구": { rtms: "11410", population: "11130" }, "마포구": { rtms: "11440", population: "11140" },
  "양천구": { rtms: "11470", population: "11150" }, "강서구": { rtms: "11500", population: "11160" },
  "구로구": { rtms: "11530", population: "11170" }, "금천구": { rtms: "11545", population: "11180" },
  "영등포구": { rtms: "11560", population: "11190" }, "동작구": { rtms: "11590", population: "11200" },
  "관악구": { rtms: "11620", population: "11210" }, "서초구": { rtms: "11650", population: "11220" },
  "강남구": { rtms: "11680", population: "11230" }, "송파구": { rtms: "11710", population: "11240" },
  "강동구": { rtms: "11740", population: "11250" },
};

const dartTargets = [
  { name: "호텔신라", aliases: ["호텔신라"], hotelIds: ["SEL-049"] },
  { name: "롯데리츠", aliases: ["롯데위탁관리부동산투자회사", "롯데리츠"], hotelIds: ["SEL-037"] },
  { name: "호텔롯데", aliases: ["호텔롯데"], hotelIds: ["SEL-029", "SEL-058", "SEL-060", "SEL-072", "SEL-079", "SEL-082"] },
  { name: "SK네트웍스", aliases: ["SK네트웍스"], hotelIds: ["SEL-032", "SEL-033"] },
  { name: "파르나스호텔", aliases: ["파르나스호텔"], hotelIds: ["SEL-009", "SEL-053", "SEL-071"] },
  { name: "서부T&D", aliases: ["서부T&D", "서부티엔디"], hotelIds: ["SEL-011", "SEL-030", "SEL-039", "SEL-047"] },
  { name: "신한서부티엔디리츠", aliases: ["신한서부티엔디위탁관리부동산투자회사", "신한서부티엔디리츠"], hotelIds: ["SEL-011", "SEL-030", "SEL-039", "SEL-047"] },
  { name: "조선호텔앤리조트", aliases: ["조선호텔앤리조트"], hotelIds: ["SEL-031"] },
  { name: "아난티", aliases: ["아난티"], hotelIds: ["SEL-008"] },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status < 500 || attempt === retries) throw new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      if (attempt === retries) throw error;
    }
    await sleep(300 * (attempt + 1));
  }
}

function unzipFirstEntry(buffer) {
  const bytes = Buffer.from(buffer);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65557); index -= 1) {
    if (bytes.readUInt32LE(index) === 0x06054b50) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error("DART corp code ZIP directory not found");
  const central = bytes.readUInt32LE(eocd + 16);
  if (bytes.readUInt32LE(central) !== 0x02014b50) throw new Error("Invalid DART ZIP central directory");
  const method = bytes.readUInt16LE(central + 10);
  const size = bytes.readUInt32LE(central + 20);
  const local = bytes.readUInt32LE(central + 42);
  const nameLength = bytes.readUInt16LE(local + 26);
  const extraLength = bytes.readUInt16LE(local + 28);
  const start = local + 30 + nameLength + extraLength;
  const compressed = bytes.subarray(start, start + size);
  if (method === 0) return compressed.toString("utf8");
  if (method === 8) return inflateRawSync(compressed).toString("utf8");
  throw new Error(`Unsupported DART ZIP method ${method}`);
}

const xmlValue = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return (match?.[1] ?? "").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").trim();
};
const normalizeCorp = (name) => name.replace(/\(주\)|주식회사|㈜|\s+/g, "").toUpperCase();

async function fetchDart() {
  const response = await fetchWithRetry(`https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${encodeURIComponent(env.DART_API_KEY)}`);
  const xml = unzipFirstEntry(await response.arrayBuffer());
  const corporations = [...xml.matchAll(/<list>([\s\S]*?)<\/list>/g)].map((match) => ({
    corpCode: xmlValue(match[1], "corp_code"), corpName: xmlValue(match[1], "corp_name"), stockCode: xmlValue(match[1], "stock_code"),
  }));
  const byHotel = {};
  const entities = [];
  for (const target of dartTargets) {
    const corporation = corporations.find((corp) => target.aliases.some((alias) => normalizeCorp(corp.corpName) === normalizeCorp(alias)))
      ?? corporations.find((corp) => target.aliases.some((alias) => normalizeCorp(corp.corpName).includes(normalizeCorp(alias))));
    if (!corporation) {
      entities.push({ name: target.name, status: "not_found", hotelIds: target.hotelIds, filings: [] });
      continue;
    }
    const url = new URL("https://opendart.fss.or.kr/api/list.json");
    for (const [key, value] of Object.entries({ crtfc_key: env.DART_API_KEY, corp_code: corporation.corpCode, bgn_de: "20230101", end_de: "20260725", page_count: "100", sort: "date", sort_mth: "desc" })) url.searchParams.set(key, value);
    const payload = await (await fetchWithRetry(url)).json();
    const material = /(사업보고서|반기보고서|분기보고서|주요사항보고서|투자설명서|증권신고서|자산운용보고서|부동산|유형자산|영업양수|영업양도)/;
    const filings = (payload.list ?? []).filter((item) => material.test(item.report_nm)).slice(0, 8).map((item) => ({
      receiptNo: item.rcept_no, date: item.rcept_dt, reportName: item.report_nm, filerName: item.flr_nm, remarks: item.rm || null,
    }));
    const entity = { name: target.name, corpName: corporation.corpName, corpCode: corporation.corpCode, stockCode: corporation.stockCode || null, status: payload.status === "000" ? "matched" : "no_filings", hotelIds: target.hotelIds, filings };
    entities.push(entity);
    for (const hotelId of target.hotelIds) {
      if (!byHotel[hotelId]) byHotel[hotelId] = [];
      byHotel[hotelId].push({ name: entity.name, corpName: entity.corpName, status: entity.status, filings });
    }
    await sleep(120);
  }
  return { source: "금융감독원 OpenDART", fetchedAt: new Date().toISOString(), entities, byHotel };
}

function monthsBetween(start, end) {
  const months = [];
  let [year, month] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) { year += 1; month = 1; }
  }
  return months;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

const parseItems = (xml) => [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
  const row = match[1];
  return {
    buildYear: Number(xmlValue(row, "buildYear")) || null,
    buildingArea: Number(xmlValue(row, "buildingAr")) || null,
    buildingType: xmlValue(row, "buildingType") || null,
    buildingUse: xmlValue(row, "buildingUse") || null,
    buyerType: xmlValue(row, "buyerGbn") || null,
    cancelDate: xmlValue(row, "cdealDay") || null,
    amountManwon: Number(xmlValue(row, "dealAmount").replaceAll(",", "")) || null,
    day: Number(xmlValue(row, "dealDay")) || null,
    month: Number(xmlValue(row, "dealMonth")) || null,
    year: Number(xmlValue(row, "dealYear")) || null,
    dealingType: xmlValue(row, "dealingGbn") || null,
    landUse: xmlValue(row, "landUse") || null,
    landArea: Number(xmlValue(row, "plottageAr")) || null,
    district: xmlValue(row, "sggNm") || null,
    sellerType: xmlValue(row, "slerGbn") || null,
    neighborhood: xmlValue(row, "umdNm") || null,
    jibunMasked: xmlValue(row, "jibun") || null,
  };
});
const median = (values) => {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

async function fetchRtms() {
  const districts = [...new Set(hotels.map((hotel) => hotel.district))].filter((district) => districtCodes[district]);
  const months = monthsBetween("2021-01", "2026-07");
  const byDistrict = {};
  for (const district of districts) {
    const batches = await mapLimit(months, 8, async (dealMonth) => {
      const url = new URL("https://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade");
      for (const [key, value] of Object.entries({ serviceKey: env.RTMS_SERVICE_KEY, LAWD_CD: districtCodes[district].rtms, DEAL_YMD: dealMonth, numOfRows: "1000", pageNo: "1" })) url.searchParams.set(key, value);
      const text = await (await fetchWithRetry(url)).text();
      if (xmlValue(text, "resultCode") !== "000") return [];
      return parseItems(text).filter((item) => item.buildingUse?.includes("숙박") && !item.cancelDate && item.amountManwon);
    });
    const seen = new Set();
    const deals = batches.flat().filter((deal) => {
      const key = [deal.year, deal.month, deal.day, deal.neighborhood, deal.jibunMasked, deal.amountManwon, deal.buildingArea, deal.landArea].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => (b.year * 10000 + b.month * 100 + b.day) - (a.year * 10000 + a.month * 100 + a.day));
    const pricePerSqm = deals.map((deal) => deal.buildingArea ? deal.amountManwon / deal.buildingArea : null).filter(Boolean);
    byDistrict[district] = {
      count: deals.length,
      medianAmountEok: median(deals.map((deal) => deal.amountManwon / 10000)),
      medianPricePerSqmManwon: median(pricePerSqm),
      latestDeals: deals.slice(0, 6),
    };
    console.log(`RTMS ${district}: ${deals.length} lodging trades`);
  }
  return { source: "국토교통부 상업·업무용 부동산 실거래가", period: "2021-01~2026-07", fetchedAt: new Date().toISOString(), byDistrict };
}

function formatDate(date) {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

async function fetchSeoulPopulation() {
  let selected = null;
  for (let offset = 4; offset <= 12; offset += 1) {
    const date = new Date(Date.UTC(2026, 6, 25 - offset));
    const dateKey = formatDate(date);
    const url = `http://openapi.seoul.go.kr:8088/${encodeURIComponent(env.SEOUL_OPEN_DATA_API_KEY)}/json/SPOP_LOCAL_RESD_JACHI/1/1000/${dateKey}`;
    const payload = await (await fetchWithRetry(url)).json();
    const root = payload.SPOP_LOCAL_RESD_JACHI;
    if (root?.RESULT?.CODE === "INFO-000" && root.row?.length) { selected = { date: dateKey, rows: root.row }; break; }
  }
  if (!selected) throw new Error("No recent Seoul population data available");
  const districtByPopulationCode = Object.fromEntries(Object.entries(districtCodes).map(([name, codes]) => [codes.rtms, name]));
  const buckets = {};
  for (const row of selected.rows) {
    const district = districtByPopulationCode[String(row.ADSTRD_CODE_SE)];
    if (!district) continue;
    if (!buckets[district]) buckets[district] = [];
    const value = Number(row.TOT_LVPOP_CO);
    if (Number.isFinite(value)) buckets[district].push(value);
  }
  const byDistrict = Object.fromEntries(Object.entries(buckets).map(([district, values]) => [district, {
    hourlyAverage: values.reduce((sum, value) => sum + value, 0) / values.length,
    hourlyPeak: Math.max(...values), hourlyLow: Math.min(...values), observations: values.length,
  }]));
  return { source: "서울 열린데이터광장 자치구 단위 생활인구(내국인)", date: selected.date, fetchedAt: new Date().toISOString(), byDistrict };
}

const modes = new Set(process.argv.slice(2));
let existing = null;
try { existing = JSON.parse(await fs.readFile("data/investment-dd.json", "utf8")); } catch {}
const all = modes.size === 0;
const [dart, rtms, seoulPopulation] = await Promise.all([
  all || modes.has("--dart-only") ? fetchDart() : Promise.resolve(existing?.dart),
  all || modes.has("--rtms-only") ? fetchRtms() : Promise.resolve(existing?.rtms),
  all || modes.has("--seoul-only") ? fetchSeoulPopulation() : Promise.resolve(existing?.seoulPopulation),
]);
if (!dart || !rtms || !seoulPopulation) throw new Error("A partial refresh requires an existing data/investment-dd.json");
const output = { generatedAt: new Date().toISOString(), dart, rtms, seoulPopulation };
await fs.mkdir("data", { recursive: true });
await fs.writeFile("data/investment-dd.json", JSON.stringify(output, null, 2));
console.log(`Saved data/investment-dd.json with ${dart.entities.length} DART entities and ${Object.keys(rtms.byDistrict).length} districts`);
