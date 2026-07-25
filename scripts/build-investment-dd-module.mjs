import fs from "node:fs/promises";

const data = JSON.parse(await fs.readFile("data/investment-dd.json", "utf8"));
const moduleText = `// Generated from data/investment-dd.json. Do not edit manually.\n` +
  `export const investmentDdData = ${JSON.stringify(data, null, 2)} as const;\n` +
  `export type InvestmentDdData = typeof investmentDdData;\n`;
await fs.writeFile("app/investmentData.ts", moduleText);
console.log("Generated app/investmentData.ts");
