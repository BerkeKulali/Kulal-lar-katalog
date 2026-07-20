/**
 * Kulalılar Katalog — service worker
 *
 * İki ayrı cache tutulur:
 *  - IMAGE_CACHE: Cloudinary ürün görselleri (cache-first, kalıcı)
 *  - SHELL_CACHE: uygulama kabuğu (HTML/JS/CSS) — ağ yokken sayfanın açılması
 *
 * Gezinme istekleri "network-first"tir: çevrimiçiyken her zaman güncel sayfa
 * gelir, ağ yoksa son başarılı kopya veya /offline sayfası gösterilir.
 * Fiyat/stok verisi asla önbellekten sunulmaz (aşağıya bakın).
 */

/**
 * DİKKAT: Görsel cache adı src/lib/offline-images.ts içindeki IMAGE_CACHE_NAME
 * ile birebir aynı olmalı — istemci de aynı cache'e yazıyor. Sürümü bump etmek
 * sahadaki tabletlerin indirdiği tüm görselleri siler; bilerek yapılmadıkça
 * değiştirmeyin.
 */
const IMAGE_CACHE = "kulalilar-images-v1";
const SHELL_CACHE = "kulalilar-shell-v1";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json", "/icons/icon-192.png"];

const CURRENT_CACHES = new Set([IMAGE_CACHE, SHELL_CACHE]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Tek bir dosya 404 verirse tüm kurulum düşmesin.
      await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("kulalilar-") && !CURRENT_CACHES.has(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isImageRequest(url) {
  return url.includes("res.cloudinary.com");
}

/** Next.js'in hash'li statik varlıkları — içerikleri değişmez. */
function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

/**
 * Bu yollar ASLA önbellekten sunulmaz: fiyat, stok, sipariş ve oturum
 * durumu bayat veriyle gösterilirse yanlış fiyatla sipariş oluşabilir.
 */
function isNeverCached(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname === "/sepet"
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isImageRequest(request.url)) {
    event.respondWith(
      cacheFirst(request, IMAGE_CACHE).catch(() => Response.error())
    );
    return;
  }

  // Çapraz kaynak diğer istekler (analitik vb.) tarayıcıya bırakılır.
  if (url.origin !== self.location.origin) return;

  if (isNeverCached(url)) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirst(request, SHELL_CACHE).catch(() => Response.error())
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type !== "PREFETCH_IMAGES") return;
  const urls = event.data.urls;
  if (!Array.isArray(urls)) return;

  event.waitUntil(
    caches.open(IMAGE_CACHE).then(async (cache) => {
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
