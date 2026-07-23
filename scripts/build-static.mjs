import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const client = path.join(root, "dist", "client");
const assets = path.join(client, "assets");
const server = path.join(root, "dist", "server");
fs.mkdirSync(assets, { recursive: true });
fs.mkdirSync(server, { recursive: true });

execFileSync(path.join(root, "node_modules", ".bin", "esbuild"), [
  "static/main.tsx",
  "--bundle",
  "--format=esm",
  "--target=es2022",
  "--minify",
  "--outfile=dist/client/assets/app.js",
], { cwd: root, stdio: "inherit" });

const css = fs.readFileSync(path.join(root, "app", "globals.css"), "utf8").replace(/^@import\s+"tailwindcss";\s*/m, "");
fs.writeFileSync(path.join(assets, "site.css"), css);
fs.copyFileSync(path.join(root, "public", "og.png"), path.join(client, "og.png"));

fs.writeFileSync(path.join(client, "index.html"), `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>서울 호텔 투자 인텔리전스</title>
    <meta name="description" content="서울 4·5성급 호텔 82개 자산의 위치, 객실, 거래사례와 투자 검토 포인트를 한 화면에서 탐색합니다." />
    <meta property="og:title" content="서울 호텔 투자 인텔리전스" />
    <meta property="og:description" content="서울 4·5성급 82개 자산을 지도와 투자 카드로 탐색합니다." />
    <meta property="og:image" content="/og.png" />
    <link rel="stylesheet" href="/assets/site.css" />
  </head>
  <body><div id="root"></div><script type="module" src="/assets/app.js"></script></body>
</html>`);

fs.writeFileSync(path.join(server, "index.js"), `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    const fallback = new URL("/index.html", request.url);
    return env.ASSETS.fetch(new Request(fallback, request));
  }
};\n`);

console.log("Static site built: dist/client + dist/server/index.js");
