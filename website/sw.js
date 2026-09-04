const CACHE = "onehub-shell-v2",
  BASE = new URL("./", self.location).href;
const ASSETS = [
  "./",
  "index.html",
  "home.css",
  "home.js",
  "cover.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
  "destiny/world.js",
  "destiny/art.js",
  "tasks.html",
  "tasks.css",
  "tasks.js",
  "styles.css",
].map((p) => new URL(p, BASE).href);
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("onehub-shell-") && name !== CACHE)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || !ASSETS.includes(url.href)) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(e.request);
        if (response.ok) await cache.put(e.request, response.clone());
        return response;
      } catch {
        return (await cache.match(e.request)) || Response.error();
      }
    })(),
  );
});
