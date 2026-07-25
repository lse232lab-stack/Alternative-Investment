import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const image = host ? `${protocol}://${host}/og.png` : "/og.png";

  return {
    title: "서울 호텔 투자 인텔리전스",
    description: "서울 4·5성급 호텔 전수 자산의 위치, 객실, 거래사례와 투자 검토 포인트를 한 화면에서 탐색합니다.",
    openGraph: {
      title: "서울 호텔 투자 인텔리전스",
      description: "서울 4·5성급 전수 자산을 지도와 투자 카드로 탐색합니다.",
      images: [{ url: image, width: 1200, height: 630 }],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
