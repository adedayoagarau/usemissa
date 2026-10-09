/* Only the anonymous offline shell is cached. Account content stays in explicit device storage. */
const CACHE = "missa-writing-offline-shell-__CACHE_VERSION__";
const ASSETS = __ASSETS__;
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await Promise.all(ASSETS.map(async asset => {
      const response = await fetch(asset, { redirect: "error", cache: "reload" });
      const type = response.headers.get("content-type") || "";
      const validType = asset.endsWith(".html") ? type.includes("text/html") : asset.endsWith(".js") ? /javascript/.test(type) : asset.endsWith(".css") ? type.includes("text/css") : /woff|octet-stream/.test(type);
      if (!response.ok || !validType || new URL(response.url).pathname !== asset) throw new Error("Offline static asset unavailable");
      await cache.put(asset, response);
    }));
  }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("missa-writing-offline-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !ASSETS.includes(url.pathname) || url.search) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(url.pathname);
    return saved ?? fetch(event.request);
  }));
});
