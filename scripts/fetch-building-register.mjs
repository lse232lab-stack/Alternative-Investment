import fs from "node:fs/promises";

const envText = await fs.readFile(".env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.trim().startsWith("#") && line.includes("=")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "")];
}));

const buildingKey = env.BUILDING_REGISTER_SERVICE_KEY;
const jusoKey = env.JUSO_API_CONFIRM_KEY;
if (!buildingKey || !jusoKey) throw new Error(".env.local에 두 API 키가 모두 필요합니다.");

const source = await fs.readFile("app/hotels.ts", "utf8");
const marker = "export const hotels: Hotel[] = ";
const start = source.indexOf(marker) + marker.length;
const end = source.indexOf(";", start);
const hotels = JSON.parse(source.slice(start, end));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : hotels.length;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const asArray = (value) => value == null ? [] : Array.isArray(value) ? value : [value];
const number = (value) => Number(value || 0);
const normalize = (value) => String(value || "").toLowerCase().replace(/[\s()·,._-]/g, "").replace(/호텔|hotel|관광/g, "");

async function fetchJson(url, params) {
  const response = await fetch(`${url}?${new URLSearchParams(params)}`, { headers: { "User-Agent": "SeoulHotelAssetResearch/1.0" } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${new URL(url).hostname}${new URL(url).pathname} HTTP ${response.status}: ${text.slice(0, 160)}`);
  try { return JSON.parse(text); } catch { throw new Error(`JSON 응답이 아님: ${text.slice(0, 120)}`); }
}

async function resolveAddress(address) {
  const data = await fetchJson("https://business.juso.go.kr/addrlink/addrLinkApi.do", {
    confmKey: jusoKey, currentPage: "1", countPerPage: "10", keyword: address, resultType: "json",
  });
  const common = data?.results?.common;
  if (common?.errorCode !== "0") throw new Error(`주소 API ${common?.errorCode}: ${common?.errorMessage}`);
  const rows = asArray(data?.results?.juso);
  return rows[0] ?? null;
}

async function fetchRegister(endpoint, parcel) {
  const params = {
    serviceKey: buildingKey,
    sigunguCd: parcel.sigunguCd,
    bjdongCd: parcel.bjdongCd,
    platGbCd: parcel.platGbCd,
    bun: parcel.bun,
    ji: parcel.ji,
    numOfRows: "100",
    pageNo: "1",
    _type: "json",
  };
  let data;
  try {
    data = await fetchJson(`https://apis.data.go.kr/1613000/BldRgstHubService/${endpoint}`, params);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("HTTP 401")) throw error;
    data = await fetchJson(`https://apis.data.go.kr/1613000/BldRgstService_v2/${endpoint}`, params);
  }
  const header = data?.response?.header;
  if (header?.resultCode && header.resultCode !== "00") throw new Error(`건축물대장 ${header.resultCode}: ${header.resultMsg}`);
  return asArray(data?.response?.body?.items?.item);
}

function selectTitle(hotel, rows) {
  const hotelName = normalize(hotel.name);
  return [...rows].sort((a, b) => {
    const score = (row) => {
      const buildingName = normalize(row.bldNm);
      let value = 0;
      if (String(row.mainPurpsCdNm || row.etcPurps).includes("숙박")) value += 100;
      if (buildingName && (hotelName.includes(buildingName) || buildingName.includes(hotelName))) value += 80;
      if (normalize(row.newPlatPlc) === normalize(hotel.address)) value += 30;
      value += Math.log10(number(row.totArea) + 1) * 3;
      return value;
    };
    return score(b) - score(a);
  })[0] ?? null;
}

const results = [];
for (const hotel of hotels.slice(0, limit)) {
  const record = { id: hotel.id, hotel: hotel.name, address: hotel.address, status: "pending", fetchedAt: new Date().toISOString() };
  try {
    const juso = await resolveAddress(hotel.address);
    if (!juso) throw new Error("주소 검색 결과 없음");
    const admCd = String(juso.admCd || "");
    const parcel = {
      sigunguCd: admCd.slice(0, 5),
      bjdongCd: admCd.slice(5, 10),
      platGbCd: String(juso.mtYn || "0"),
      bun: String(juso.lnbrMnnm || "0").padStart(4, "0"),
      ji: String(juso.lnbrSlno || "0").padStart(4, "0"),
    };
    if (parcel.sigunguCd.length !== 5 || parcel.bjdongCd.length !== 5) throw new Error("법정동코드 변환 실패");
    const [titleResult, recapResult] = await Promise.allSettled([
      fetchRegister("getBrTitleInfo", parcel),
      fetchRegister("getBrRecapTitleInfo", parcel),
    ]);
    const titles = titleResult.status === "fulfilled" ? titleResult.value : [];
    const recaps = recapResult.status === "fulfilled" ? recapResult.value : [];
    if (!titles.length && !recaps.length) {
      const reasons = [titleResult, recapResult].filter((result) => result.status === "rejected").map((result) => result.reason?.message || String(result.reason));
      if (reasons.length) throw new Error(reasons.join(" | "));
    }
    record.status = titles.length || recaps.length ? "matched" : "not_found";
    record.juso = { roadAddr: juso.roadAddr, jibunAddr: juso.jibunAddr, admCd, rnMgtSn: juso.rnMgtSn, ...parcel };
    record.title = selectTitle(hotel, titles);
    record.recap = recaps.sort((a, b) => number(b.totArea) - number(a.totArea))[0] ?? null;
    record.candidateCount = { titles: titles.length, recaps: recaps.length };
    process.stdout.write(`${hotel.id} ${record.status} ${record.title?.bldNm || record.recap?.bldNm || "-"}\n`);
  } catch (error) {
    record.status = "error";
    record.error = error instanceof Error ? error.message : String(error);
    process.stdout.write(`${hotel.id} error ${record.error}\n`);
  }
  results.push(record);
  await sleep(80);
}

await fs.writeFile("data/building-register.json", JSON.stringify({ generatedAt: new Date().toISOString(), count: results.length, results }, null, 2));
console.log(`Saved ${results.length} records to data/building-register.json`);
