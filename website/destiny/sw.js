const CACHE = "destiny-shell-v22";
const BASE = new URL("./", self.location).href;
const ASSETS = [
  "./",
  "index.html",
  "game.css",
  "game.js",
  "world.js",
  "depth.js",
  "economy.js",
  "frontier.js",
  "soundscape.js",
  "signals.js",
  "ledger.js",
  "pressure.js",
  "industry.js",
  "civic.js",
  "advice.js",
  "geography.js",
  "art.js",
  "pwa.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png",
].map((p) => new URL(p, BASE).href);
self.addEventListener("install", (event) =>
  // A new shell must not reuse fresh-looking HTTP-cache entries from an old
  // release. Otherwise its module graph can mix incompatible exports.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map(url=>new Request(url,{cache:"reload"}))))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("destiny-shell-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(BASE)
  )
    return;
  // One version of the complete shell is served together. New code waits until
  // the player saves and accepts the waiting worker.
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (c) =>
            (await c.match(new URL("./", BASE).href)) || fetch(event.request),
        ),
    );
    return;
  }
  if (ASSETS.includes(url.href))
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (c) => (await c.match(event.request)) || fetch(event.request),
        ),
    );
});
