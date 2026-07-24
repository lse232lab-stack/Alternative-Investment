import fs from "node:fs/promises";

const data = JSON.parse(await fs.readFile("data/building-register.json", "utf8"));
const value = (primary, fallback, key) => primary?.[key] || fallback?.[key] || null;
const clean = (raw) => {
  const text = String(raw ?? "").trim();
  return text || null;
};
const countParking = (row) => ["indrMechUtcnt", "oudrMechUtcnt", "indrAutoUtcnt", "oudrAutoUtcnt"].reduce((sum, key) => sum + Number(row?.[key] || 0), 0);
const formatDate = (raw) => {
  const text = String(raw || "").trim();
  return /^\d{8}$/.test(text) ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}` : null;
};

const records = {};
for (const item of data.results) {
  if (item.status !== "matched") continue;
  const title = item.title;
  const recap = item.recap;
  const row = title || recap;
  if (!row) continue;
  const purpose = [clean(row.mainPurpsCdNm), clean(row.etcPurps)].filter(Boolean).join(" · ");
  records[item.id] = {
    source: "국토교통부 건축HUB 건축물대장",
    fetchedAt: item.fetchedAt,
    buildingName: clean(row.bldNm),
    ledgerScope: clean(title ? title.regstrKindCdNm : recap?.regstrKindCdNm) || (title ? "표제부" : "총괄표제부"),
    parcelAddress: clean(row.platPlc) || clean(item.juso?.jibunAddr),
    roadAddress: clean(row.newPlatPlc) || clean(item.juso?.roadAddr),
    mainPurpose: purpose || null,
    structure: clean(row.strctCdNm) || clean(row.etcStrct),
    siteArea: Number(value(recap, title, "platArea") || 0) || null,
    buildingArea: Number(value(title, recap, "archArea") || 0) || null,
    totalArea: Number(value(title, recap, "totArea") || 0) || null,
    coverageRatio: Number(value(recap, title, "bcRat") || 0) || null,
    floorAreaRatio: Number(value(recap, title, "vlRat") || 0) || null,
    floorsAbove: Number(value(title, recap, "grndFlrCnt") || 0) || null,
    floorsBelow: Number(value(title, recap, "ugrndFlrCnt") || 0) || null,
    height: Number(value(title, recap, "heit") || 0) || null,
    parking: countParking(recap) || countParking(title) || null,
    passengerElevators: Number(value(title, recap, "rideUseElvtCnt") || 0) || null,
    emergencyElevators: Number(value(title, recap, "emgenUseElvtCnt") || 0) || null,
    permitDate: formatDate(value(title, recap, "pmsDay")),
    constructionDate: formatDate(value(title, recap, "stcnsDay")),
    approvalDate: formatDate(value(title, recap, "useAprDay")),
    seismicApplied: String(value(title, recap, "rserthqkDsgnApplyYn") || "") === "1" ? "적용" : String(value(title, recap, "rserthqkDsgnApplyYn") || "") === "0" ? "미적용/기재없음" : null,
    seismicCapacity: clean(value(title, recap, "rserthqkAblty")),
    energyGrade: clean(value(title, recap, "engrGrade")),
    managementPk: row.mgmBldrgstPk || null,
    hotelUseMatched: purpose.includes("숙박"),
    candidateCount: item.candidateCount,
  };
}

// Keep the generated module simple and type inference-friendly.
const moduleText = `// Generated from data/building-register.json. Do not edit manually.\n` +
`export const buildingRegister = ${JSON.stringify(records, null, 2)} as const;\n` +
`export type BuildingRegisterRecord = (typeof buildingRegister)[keyof typeof buildingRegister];\n`;
await fs.writeFile("app/buildingRegister.ts", moduleText);
console.log(`Generated app/buildingRegister.ts with ${Object.keys(records).length} matched records`);
