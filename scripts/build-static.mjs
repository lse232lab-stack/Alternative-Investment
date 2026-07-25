import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const client = path.join(root, "dist", "client");
const assets = path.join(client, "assets");
const server = path.join(root, "dist", "server");
fs.mkdirSync(assets, { recursive: true });
fs.mkdirSync(server, { recursive: true });

function loadLocalEnv() {
  const file = path.join(root, ".env.local");
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, "utf8").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const index = line.indexOf("=");
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [line.slice(0, index).trim(), value];
  }));
}

const localEnv = loadLocalEnv();
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || localEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
if (!publishableKey.startsWith("pk_")) throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY가 .env.local에 필요합니다.");
const esbuild = path.join(root, "node_modules", ".bin", "esbuild");
const common = ["--bundle", "--format=esm", "--target=es2022", "--minify", `--define:__CLERK_PUBLISHABLE_KEY__=${JSON.stringify(publishableKey)}`];

for (const [entry, output] of [["static/main.tsx", "dist/client/assets/app.js"], ["static/bootstrap.ts", "dist/client/assets/bootstrap.js"], ["static/auth.ts", "dist/client/assets/auth.js"]]) {
  execFileSync(esbuild, [entry, ...common, `--outfile=${output}`], { cwd: root, stdio: "inherit" });
}

const leafletCss = fs.readFileSync(path.join(root, "node_modules", "leaflet", "dist", "leaflet.css"), "utf8");
const appCss = fs.readFileSync(path.join(root, "app", "globals.css"), "utf8").replace(/^@import\s+"tailwindcss";\s*/m, "");
const authCss = fs.readFileSync(path.join(root, "static", "auth.css"), "utf8");
fs.writeFileSync(path.join(assets, "site.css"), `${leafletCss}\n${appCss}\n${authCss}`);
fs.copyFileSync(path.join(root, "public", "og.png"), path.join(client, "og.png"));

const head = `<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="description" content="서울 4·5성급 호텔 82개 자산의 위치, 객실, 거래사례와 투자 검토 포인트를 탐색합니다." /><meta property="og:title" content="서울 호텔 투자 인텔리전스" /><meta property="og:image" content="/og.png" /><link rel="stylesheet" href="/assets/site.css" />`;
fs.writeFileSync(path.join(client, "index.html"), `<!doctype html><html lang="ko"><head>${head}<title>서울 호텔 투자 인텔리전스</title></head><body><div id="root"><main class="access-error"><p>회원 정보를 확인하고 있습니다…</p></main></div><script type="module" src="/assets/bootstrap.js"></script></body></html>`);
fs.writeFileSync(path.join(client, "login.html"), `<!doctype html><html lang="ko"><head>${head}<title>회원 로그인 · 서울 호텔 투자 인텔리전스</title></head><body><main class="auth-shell"><section class="auth-intro"><small>Alternative Investment Research</small><div><h1>Seoul Hotel<br/>Capital Map</h1><p>서울 4·5성급 호텔의 자산·투자·입지·상권 데이터를 스터디 멤버와 안전하게 공유합니다.</p></div><strong>Created by lse_232</strong></section><section class="auth-panel"><div class="auth-card"><h2>멤버 접속</h2><p>사용자명과 비밀번호로 로그인하거나 새 계정을 만드세요.</p><div id="clerk-auth"></div></div></section></main><script type="module" src="/assets/auth.js"></script></body></html>`);
const protectedAppPath = path.join(assets, "app.js");
const protectedAppSource = fs.readFileSync(protectedAppPath, "utf8");
const workerTemplate = fs.readFileSync(path.join(root, "static", "secure-worker.mjs"), "utf8");
const workerSource = workerTemplate.replace('const PROTECTED_APP_SOURCE = "";', `const PROTECTED_APP_SOURCE = ${JSON.stringify(protectedAppSource)};`);
fs.writeFileSync(path.join(server, "index.js"), workerSource);
fs.unlinkSync(protectedAppPath);

console.log("Authenticated site built: public login + protected hotel bundle + D1 audit worker");
