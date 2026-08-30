// 이 서비스워커는 "홈 화면에 추가"(설치) 기능이 동작하려면 활성화된 서비스워커가
// 필요해서 존재합니다. 상품 페이지·가격·버튼 UI는 항상 최신 내용을 보여줘야 하므로
// 여기서는 아무것도 캐싱하지 않고 모든 요청을 그대로 네트워크로 흘려보냅니다.
//
// 혹시 예전 버전의 앱/실험 중이던 캐싱 방식이 이미 설치돼 있던 기기가 있다면,
// 이 파일이 활성화되는 시점에 그 캐시를 전부 지워서 "새로 배포했는데 화면이
// 안 바뀐다" 같은 문제가 다시는 생기지 않도록 합니다.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", () => {
  // 아무것도 캐싱하지 않음 — 항상 네트워크로 요청해서 최신 화면을 받아온다.
});
