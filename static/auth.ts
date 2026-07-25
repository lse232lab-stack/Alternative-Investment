import { loadClerk } from "./clerk-loader";

async function start() {
  const clerk = await loadClerk();
  if (clerk.user) {
    location.replace("/");
    return;
  }
  const target = document.getElementById("clerk-auth");
  if (!target) return;
  if (location.pathname === "/sign-up") {
    clerk.mountSignUp(target, {
      signInUrl: "/login",
      forceRedirectUrl: "/",
    });
  } else {
    clerk.mountSignIn(target, {
      signUpUrl: "/sign-up",
      forceRedirectUrl: "/",
    });
  }
}

start().catch((error) => {
  const target = document.getElementById("clerk-auth");
  if (target) target.textContent = error instanceof Error ? error.message : "로그인을 시작하지 못했습니다.";
});
