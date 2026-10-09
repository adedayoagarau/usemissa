/* Only the anonymous offline shell is cached. Account content stays in explicit device storage. */
const CACHE = "missa-writing-offline-shell-e2226fbaee0df092";
const ASSETS = ["/writing-offline/index.html","/writing-offline/generated/editor.js","/writing-offline/generated/editor.css","/writing-offline/generated/courier-prime.woff2","/writing-offline/generated/ia-writer-duo.woff2","/writing-offline/generated/anonymous-pro.woff2","/writing-offline/generated/literata.woff2","/writing-offline/generated/eb-garamond.woff2","/writing-offline/generated/libre-baskerville.woff2","/writing-offline/generated/cormorant-garamond.woff2","/writing-offline/generated/atkinson-hyperlegible-next.woff2","/writing-offline/generated/newsreader-variable.woff2","/writing-offline/generated/instrument-sans.woff2","/writing-offline/generated/fragment-mono.woff2"];
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
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Network first and never cached: only the writing document gets an anonymous fallback.
  if (event.request.mode === "navigate" && url.pathname === "/doc") {
    const fallback = async () => {
      const shell = await (await caches.open(CACHE)).match("/writing-offline/index.html");
      // Keep the requested /doc URL rather than inheriting the cached shell response URL.
      return shell ? new Response(shell.body, { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" } }) : Response.error();
    };
    event.respondWith(self.navigator.onLine === false ? fallback() : fetch(event.request, { cache: "no-store" }).catch(fallback));
    return;
  }
  if (!ASSETS.includes(url.pathname) || url.search) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(url.pathname);
    return saved ?? fetch(event.request);
  }));
});
