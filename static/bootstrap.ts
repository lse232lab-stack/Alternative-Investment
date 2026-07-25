import { loadClerk } from "./clerk-loader";

type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char] || char);
}

async function api(path: string, token: string) {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

function mountMemberBar(clerk: any, user: SessionUser, getToken: () => Promise<string | null>) {
  const bar = document.createElement("aside");
  bar.className = "member-bar";
  bar.innerHTML = `<span class="creator-mark">Created by lse_232</span><span class="member-name">${escapeHtml(user.displayName || user.username)}</span>${user.isAdmin ? '<button type="button" data-admin>이용자 내역</button>' : ""}<button type="button" data-signout>로그아웃</button>`;
  document.body.appendChild(bar);
  bar.querySelector("[data-signout]")?.addEventListener("click", async () => {
    await clerk.signOut();
    location.replace("/login");
  });
  bar.querySelector("[data-admin]")?.addEventListener("click", async () => {
    const existing = document.querySelector(".admin-modal");
    if (existing) { existing.remove(); return; }
    const modal = document.createElement("section");
    modal.className = "admin-modal";
    modal.innerHTML = '<div class="admin-card"><button type="button" class="admin-close">닫기</button><h2>이용자 접속 내역</h2><p>불러오는 중…</p></div>';
    document.body.appendChild(modal);
    modal.querySelector(".admin-close")?.addEventListener("click", () => modal.remove());
    try {
      const token = await getToken();
      if (!token) throw new Error("로그인이 만료되었습니다.");
      const data = await api("/api/admin/users", token);
      const rows = data.users.map((item: any) => `<tr><td>${escapeHtml(item.username || "-")}</td><td>${escapeHtml(item.displayName || "-")}</td><td>${escapeHtml(item.email || "-")}</td><td>${escapeHtml(item.visitCount)}</td><td>${escapeHtml(item.lastSeenAt)}</td></tr>`).join("");
      const card = modal.querySelector(".admin-card");
      if (card) card.innerHTML = `<button type="button" class="admin-close">닫기</button><h2>이용자 접속 내역</h2><p>총 ${data.users.length}명 · 비밀번호는 Clerk가 관리하며 관리자도 볼 수 없습니다.</p><div class="admin-table-wrap"><table><thead><tr><th>사용자명</th><th>이름</th><th>이메일</th><th>접속</th><th>최근 접속</th></tr></thead><tbody>${rows}</tbody></table></div>`;
      modal.querySelector(".admin-close")?.addEventListener("click", () => modal.remove());
    } catch (error) {
      const message = error instanceof Error ? error.message : "내역을 불러오지 못했습니다.";
      const paragraph = modal.querySelector("p");
      if (paragraph) paragraph.textContent = message;
    }
  });
}

async function start() {
  const clerk = await loadClerk();
  if (!clerk.user || !clerk.session) {
    location.replace("/login");
    return;
  }
  const token = await clerk.session.getToken();
  if (!token) throw new Error("세션 토큰을 확인할 수 없습니다.");
  const session = await api("/api/session", token);
  const response = await fetch("/protected/app.js", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("보호된 호텔 데이터를 불러오지 못했습니다.");
  const source = await response.text();
  const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  const app = await import(/* @vite-ignore */ moduleUrl);
  const getToken = () => clerk.session.getToken();
  app.mountHotelApp({ getToken, user: session.user });
  mountMemberBar(clerk, session.user, getToken);
  URL.revokeObjectURL(moduleUrl);
}

start().catch((error) => {
  const root = document.getElementById("root");
  if (root) root.innerHTML = `<main class="access-error"><h1>접속할 수 없습니다</h1><p>${escapeHtml(error instanceof Error ? error.message : error)}</p><a href="/login">로그인 화면으로</a></main>`;
});
