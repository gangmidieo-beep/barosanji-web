// 킬 스위치 서비스워커.
// 카카오톡 인앱 브라우저에서 서비스워커가 "까만 백지"를 유발하는 문제가 있어,
// 서비스워커를 완전히 없애기로 했습니다. 이 파일은 이미 손님 기기에 설치돼 있던
// 예전 서비스워커를 "스스로 제거"하고 캐시를 전부 지운 뒤, 열려있는 페이지를
// 새로고침해서 정상(서비스워커 없는) 화면으로 되돌립니다.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* 무시 */
      }
      try {
        await self.registration.unregister();
      } catch {
        /* 무시 */
      }
      try {
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.navigate(c.url));
      } catch {
        /* 무시 */
      }
    })()
  );
});

// 아무것도 가로채지 않음 — 항상 네트워크로 그대로 흘려보낸다.
self.addEventListener("fetch", () => {});
