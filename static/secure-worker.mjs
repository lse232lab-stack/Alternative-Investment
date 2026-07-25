// Static authenticated entrypoint used by the Sites production bundle.
const encoder = new TextEncoder();
const PROTECTED_APP_SOURCE = "";

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
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS member_visits (
    clerk_user_id TEXT PRIMARY KEY,
    username TEXT,
    display_name TEXT,
    email TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    visit_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
  )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS institutional_deals (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL,
      hotel_name TEXT NOT NULL,
      stage TEXT NOT NULL,
      model_json TEXT NOT NULL,
      owner_user_id TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS deal_events (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL,
      actor_user_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      stage TEXT,
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS institutional_deals_updated_idx ON institutional_deals(updated_at DESC)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS deal_events_deal_idx ON deal_events(deal_id, created_at DESC)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS deal_documents (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL,
      uploader_user_id TEXT NOT NULL,
      uploader_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      r2_key TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS deal_documents_deal_idx ON deal_documents(deal_id, created_at DESC)"),
  ]);
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

const allowedStages = new Set(["Screening", "Underwriting", "LOI", "Due Diligence", "IC Review", "Closing", "Portfolio", "Exit"]);

async function readDealPayload(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 500000) throw new Error("딜 데이터가 너무 큽니다.");
  const payload = await request.json();
  if (!payload || typeof payload !== "object" || typeof payload.hotelId !== "string" || typeof payload.hotelName !== "string" || !allowedStages.has(payload.stage) || !payload.model || typeof payload.model !== "object") throw new Error("딜 입력값을 확인해주세요.");
  const modelJson = JSON.stringify(payload.model);
  if (modelJson.length > 400000) throw new Error("딜 모델이 저장 한도를 초과했습니다.");
  return { hotelId: payload.hotelId.slice(0, 40), hotelName: payload.hotelName.slice(0, 160), stage: payload.stage, modelJson };
}

function serializeDeal(row) {
  let model = {};
  try { model = JSON.parse(row.modelJson || row.model_json || "{}"); } catch {}
  return {
    id: row.id, hotelId: row.hotelId || row.hotel_id, hotelName: row.hotelName || row.hotel_name, stage: row.stage,
    ownerName: row.ownerName || row.owner_name, updatedAt: row.updatedAt || row.updated_at, createdAt: row.createdAt || row.created_at, model,
  };
}

async function recordDealEvent(env, dealId, user, action, stage) {
  await env.DB.prepare("INSERT INTO deal_events (id, deal_id, actor_user_id, actor_name, action, stage, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), dealId, user.id, user.displayName, action, stage, new Date().toISOString()).run();
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
      if (url.pathname === "/api/deals" && request.method === "GET") {
        await authenticate(request, env);
        await ensureDatabase(env);
        if (!env.DB) return json({ deals: [] });
        const result = await env.DB.prepare("SELECT id, hotel_id AS hotelId, hotel_name AS hotelName, stage, model_json AS modelJson, owner_name AS ownerName, created_at AS createdAt, updated_at AS updatedAt FROM institutional_deals ORDER BY updated_at DESC LIMIT 200").all();
        return json({ deals: (result.results || []).map(serializeDeal) });
      }
      if (url.pathname === "/api/deals" && request.method === "POST") {
        const user = await authenticate(request, env);
        await ensureDatabase(env);
        if (!env.DB) return json({ error: "저장소를 사용할 수 없습니다." }, 503);
        const payload = await readDealPayload(request);
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare("INSERT INTO institutional_deals (id, hotel_id, hotel_name, stage, model_json, owner_user_id, owner_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, payload.hotelId, payload.hotelName, payload.stage, payload.modelJson, user.id, user.displayName, now, now).run();
        await recordDealEvent(env, id, user, "created", payload.stage);
        return json({ deal: serializeDeal({ id, ...payload, modelJson: payload.modelJson, ownerName: user.displayName, createdAt: now, updatedAt: now }) }, 201);
      }
      const dealMatch = url.pathname.match(/^\/api\/deals\/([A-Za-z0-9-]+)$/);
      if (dealMatch && request.method === "PUT") {
        const user = await authenticate(request, env);
        await ensureDatabase(env);
        if (!env.DB) return json({ error: "저장소를 사용할 수 없습니다." }, 503);
        const existing = await env.DB.prepare("SELECT owner_user_id AS ownerUserId FROM institutional_deals WHERE id = ?").bind(dealMatch[1]).first();
        if (!existing) return json({ error: "딜을 찾을 수 없습니다." }, 404);
        if (existing.ownerUserId !== user.id && !user.isAdmin) return json({ error: "작성자 또는 관리자만 수정할 수 있습니다." }, 403);
        const payload = await readDealPayload(request);
        const now = new Date().toISOString();
        await env.DB.prepare("UPDATE institutional_deals SET hotel_id = ?, hotel_name = ?, stage = ?, model_json = ?, updated_at = ? WHERE id = ?").bind(payload.hotelId, payload.hotelName, payload.stage, payload.modelJson, now, dealMatch[1]).run();
        await recordDealEvent(env, dealMatch[1], user, "updated", payload.stage);
        const row = await env.DB.prepare("SELECT id, hotel_id AS hotelId, hotel_name AS hotelName, stage, model_json AS modelJson, owner_name AS ownerName, created_at AS createdAt, updated_at AS updatedAt FROM institutional_deals WHERE id = ?").bind(dealMatch[1]).first();
        return json({ deal: serializeDeal(row) });
      }
      const documentsMatch = url.pathname.match(/^\/api\/deals\/([A-Za-z0-9-]+)\/documents$/);
      if (documentsMatch && request.method === "GET") {
        await authenticate(request, env); await ensureDatabase(env);
        if (!env.DB) return json({ documents: [] });
        const result = await env.DB.prepare("SELECT id, filename, content_type AS contentType, size_bytes AS sizeBytes, uploader_name AS uploaderName, created_at AS createdAt FROM deal_documents WHERE deal_id = ? ORDER BY created_at DESC").bind(documentsMatch[1]).all();
        return json({ documents: result.results || [] });
      }
      if (documentsMatch && request.method === "POST") {
        const user = await authenticate(request, env); await ensureDatabase(env);
        if (!env.DB || !env.FILES) return json({ error: "문서 저장소를 사용할 수 없습니다." }, 503);
        const deal = await env.DB.prepare("SELECT owner_user_id AS ownerUserId FROM institutional_deals WHERE id = ?").bind(documentsMatch[1]).first();
        if (!deal) return json({ error: "딜을 찾을 수 없습니다." }, 404);
        if (deal.ownerUserId !== user.id && !user.isAdmin) return json({ error: "작성자 또는 관리자만 문서를 추가할 수 있습니다." }, 403);
        const form = await request.formData(); const file = form.get("file");
        if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") return json({ error: "업로드 파일이 필요합니다." }, 400);
        if (file.size > 10 * 1024 * 1024) return json({ error: "파일은 10MB 이하만 허용됩니다." }, 413);
        const id = crypto.randomUUID(); const safeName = String(file.name || "document").replace(/[^0-9A-Za-z가-힣._ -]/g, "_").slice(0, 180); const r2Key = `deals/${documentsMatch[1]}/${id}`; const now = new Date().toISOString();
        await env.FILES.put(r2Key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { filename: safeName } });
        await env.DB.prepare("INSERT INTO deal_documents (id, deal_id, uploader_user_id, uploader_name, filename, content_type, size_bytes, r2_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, documentsMatch[1], user.id, user.displayName, safeName, file.type || "application/octet-stream", file.size, r2Key, now).run();
        await recordDealEvent(env, documentsMatch[1], user, "document_uploaded", null);
        return json({ document: { id, filename: safeName, contentType: file.type || "application/octet-stream", sizeBytes: file.size, uploaderName: user.displayName, createdAt: now } }, 201);
      }
      const documentMatch = url.pathname.match(/^\/api\/deals\/([A-Za-z0-9-]+)\/documents\/([A-Za-z0-9-]+)$/);
      if (documentMatch && request.method === "GET") {
        await authenticate(request, env); await ensureDatabase(env);
        if (!env.DB || !env.FILES) return json({ error: "문서 저장소를 사용할 수 없습니다." }, 503);
        const document = await env.DB.prepare("SELECT filename, content_type AS contentType, r2_key AS r2Key FROM deal_documents WHERE id = ? AND deal_id = ?").bind(documentMatch[2], documentMatch[1]).first();
        if (!document) return json({ error: "문서를 찾을 수 없습니다." }, 404);
        const object = await env.FILES.get(document.r2Key); if (!object) return json({ error: "문서 파일을 찾을 수 없습니다." }, 404);
        const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`); headers.set("cache-control", "private, no-store");
        return new Response(object.body, { headers });
      }
      if (url.pathname === "/protected/app.js") {
        await authenticate(request, env);
        return new Response(PROTECTED_APP_SOURCE, { headers: { "cache-control": "private, no-store", "content-type": "text/javascript; charset=utf-8" } });
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
