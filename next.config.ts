import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // 관리자 상품 등록 화면에서 사진을 여러 장(최대 10+10장) 올리면 요청 본문이 커지는데,
    // /api/admin/* 경로를 지키는 미들웨어(middleware.ts)가 요청을 복제해서 검사하는 과정에서
    // 기본 10MB 제한에 걸려 "상품 등록"이 조용히 실패하는 문제가 있어 한도를 늘려둡니다.
    middlewareClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
