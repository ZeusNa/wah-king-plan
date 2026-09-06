// 華景計劃 PWA 快取 + 離線
// v2：index.html 行 network-first（更新先傳），其他資產 cache-first；舊 cache 喺 activate 時清除
const CACHE = "wah-king-plan-v2";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png",
  "./img/ruysch.jpg", "./img/brueghel.jpg", "./img/monet.jpg"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // 頁面/文件：network-first —— 有更新即刻見到；斷網/網址失效先落返 cache
  if (e.request.mode === "navigate" || e.request.destination === "document") {
    e.respondWith(
      fetch(e.request).then(res => {
        if (!res.ok) {
          // 唔好 cache 404/403，即刻用返之前嘅版本
          return caches.match(e.request).then(hit => hit || caches.match("./index.html"));
        }
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }
  // 其他：cache-first
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(res => {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
