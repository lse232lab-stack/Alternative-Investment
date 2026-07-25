const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function decodePart(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeJson(value) {
  return JSON.parse(new TextDecoder().decode(decodePart(value)));
}

async function verifySessionToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("로그인이 필요합니다.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("잘못된 세션 토큰입니다.");
  const header = decodeJson(parts[0]);
  const claims = decodeJson(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("지원하지 않는 세션 토큰입니다.");
  const now = Math.floor(Date.now() / 1000);
  if (!claims.sub || !claims.iss || claims.exp <= now || (claims.nbf && claims.nbf > now + 5)) throw new Error("세션이 만료되었거나 유효하지 않습니다.");
  const origin = new URL(request.url).origin;
  if (claims.azp && claims.azp !== origin) throw new Error("허용되지 않은 접속 경로입니다.");
  const issuer = new URL(claims.iss);
  if (issuer.protocol !== "https:") throw new Error("잘못된 토큰 발급자입니다.");
  const jwksResponse = await fetch(new URL("/.well-known/jwks.json", issuer), { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!jwksResponse.ok) throw new Error("인증서 확인에 실패했습니다.");
  const jwks = await jwksResponse.json();
  const jwk = jwks.keys?.find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) throw new Error("인증 키를 찾을 수 없습니다.");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decodePart(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!verified) throw new Error("세션 서명이 올바르지 않습니다.");
  return claims;
}

async function getClerkUser(env, userId) {
  if (!env.CLERK_SECRET_KEY) throw new Error("Clerk secret is not configured");
  const response = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Clerk 사용자 정보를 확인하지 못했습니다.");
  return response.json();
}

function normalizeUser(raw, env) {
  const email = raw.email_addresses?.find((item) => item.id === raw.primary_email_address_id)?.email_address || raw.email_addresses?.[0]?.email_address || "";
  const username = raw.username || "";
  const displayName = [raw.first_name, raw.last_name].filter(Boolean).join(" ") || username || email || "사용자";
  return { id: raw.id, username, displayName, email, isAdmin: username === (env.ADMIN_USERNAME || "lse_232") };
}

async function ensureDatabase(env) {
  if (!env.DB) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS member_visits (
    clerk_user_id TEXT PRIMARY KEY,
    username TEXT,
    display_name TEXT,
    email TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    visit_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
  )`).run();
}

async function recordVisit(env, user) {
  if (!env.DB) return;
  await ensureDatabase(env);
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO member_visits (clerk_user_id, username, display_name, email, first_seen_at, last_seen_at, visit_count, status)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'active')
    ON CONFLICT(clerk_user_id) DO UPDATE SET username = excluded.username, display_name = excluded.display_name,
      email = excluded.email, last_seen_at = excluded.last_seen_at, visit_count = member_visits.visit_count + 1`).bind(user.id, user.username, user.displayName, user.email, now, now).run();
}

async function authenticate(request, env) {
  const claims = await verifySessionToken(request);
  const raw = await getClerkUser(env, claims.sub);
  return normalizeUser(raw, env);
}

async function serveAsset(env, request, pathname) {
  const url = new URL(pathname, request.url);
  return env.ASSETS.fetch(new Request(url, request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/session") {
        const user = await authenticate(request, env);
        await recordVisit(env, user);
        return json({ user: { id: user.id, username: user.username, displayName: user.displayName, isAdmin: user.isAdmin } });
      }
      if (url.pathname === "/api/admin/users") {
        const user = await authenticate(request, env);
        if (!user.isAdmin) return json({ error: "관리자 권한이 필요합니다." }, 403);
        await ensureDatabase(env);
        if (!env.DB) return json({ users: [] });
        const result = await env.DB.prepare("SELECT clerk_user_id AS id, username, display_name AS displayName, email, first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt, visit_count AS visitCount, status FROM member_visits ORDER BY last_seen_at DESC LIMIT 500").all();
        return json({ users: result.results || [] });
      }
      if (url.pathname === "/protected/app.js") {
        await authenticate(request, env);
        const response = await serveAsset(env, request, "/assets/app.js");
        const headers = new Headers(response.headers);
        headers.set("cache-control", "private, no-store");
        headers.set("content-type", "text/javascript; charset=utf-8");
        return new Response(response.body, { status: response.status, headers });
      }
      if (url.pathname === "/assets/app.js") return new Response("Not found", { status: 404 });
      if (url.pathname === "/login" || url.pathname === "/sign-up") return serveAsset(env, request, "/login.html");
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) return response;
      return serveAsset(env, request, "/index.html");
    } catch (error) {
      const message = error instanceof Error ? error.message : "인증 처리 중 오류가 발생했습니다.";
      return json({ error: message }, 401);
    }
  },
};
