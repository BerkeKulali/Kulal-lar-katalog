const CACHE = "kulalilar-images-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("kulalilar-images-") && k !== CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  if (
    event.request.method !== "GET" ||
    !url.includes("res.cloudinary.com")
  ) {
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response.ok) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return cached ?? Response.error();
      }
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREFETCH_IMAGES") return;
  const urls = event.data.urls as string[];
  if (!Array.isArray(urls)) return;

  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const url of urls) {
        try {
          const res = await fetch(url, { mode: "cors" });
          if (res.ok) await cache.put(url, res);
        } catch {
          // skip
        }
      }
    })
  );
});
