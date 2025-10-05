const CACHE_NAME = "inventory-app-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
// inventory.json은 별도 전략(네트워크 우선)로 다룸

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // inventory.json → 네트워크 우선, 실패 시 캐시
  if (url.pathname.endsWith("/inventory.json") || url.pathname === "/inventory.json") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // 앱 셸 → 캐시 우선
  if (APP_SHELL.some((path) => url.pathname.endsWith(path.replace("./","/")))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // 기타 요청 → 기본(네트워크)
  // 필요시 여기서도 캐시 전략 추가 가능
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  const cache = await caches.open(CACHE_NAME);
  cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // 완전 실패 시 간단한 응답
    return new Response(JSON.stringify({ rows: [] }), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
      status: 200
    });
  }
}
