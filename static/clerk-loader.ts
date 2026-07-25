declare global {
  interface Window {
    Clerk: any;
  }
}

declare const __CLERK_PUBLISHABLE_KEY__: string;

export async function loadClerk() {
  if (!__CLERK_PUBLISHABLE_KEY__) throw new Error("Clerk publishable key is missing");
  if (!window.Clerk) {
    const encoded = __CLERK_PUBLISHABLE_KEY__.split("_").slice(2).join("_");
    const frontendApi = atob(encoded).replace(/\$$/, "");
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.clerkPublishableKey = __CLERK_PUBLISHABLE_KEY__;
      script.src = `https://${frontendApi}/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Clerk 로그인 모듈을 불러오지 못했습니다."));
      document.head.appendChild(script);
    });
  }
  await window.Clerk.load();
  return window.Clerk;
}

export {};
