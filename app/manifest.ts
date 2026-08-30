import type { MetadataRoute } from "next";

/**
 * PWA 매니페스트 — 모바일에서 "홈 화면에 추가", 데스크톱 크롬에서 "앱 설치"를
 * 누르면 이 정보(이름/아이콘/테마색)로 바로가기가 생성됨.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "바로산지 - 농가에서 바로 보내는 신선함",
    short_name: "바로산지",
    description: "농가와 직접 연결되는 산지직송 농수산물 쇼핑몰",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1f7a34",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
