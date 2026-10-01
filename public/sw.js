// Service worker: network first, cache as offline fallback.
// Network first means a new deployment is always picked up when online; the cache only serves offline.
const CACHE = "vermoegensplaner-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") return (await caches.match("/")) || Response.error();
      return Response.error();
    }
  })());
});
