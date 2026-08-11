import {
  cacheImages,
  collectPendingImages,
  isWifiConnection,
} from "@/lib/offline-images";
import { SYNC_INTERVAL_MS, FULL_SYNC_MAX_AGE_MS } from "@/lib/sync-types";
import { useCatalogSyncStore } from "@/store/catalog-sync";

let downloadInFlight: Promise<void> | null = null;

/**
 * Delta mi tam senkron mu yapılacağına karar verir. Güvenlik ağı: bir delta
 * senkronu kaçırılan bir ürünü SONSUZA kadar atlayabilir (ör. tam senkron
 * sırasında offline olan bir cihaz). Bu yüzden "en son ne zaman tam senkron
 * yapıldı" ölçülmeli (lastFullSyncAt) — delta senkronlarla sürekli
 * tazelenen lastSyncAt değil, aksi halde cihaz hep online kaldığı sürece
 * tam senkron hiç tetiklenmez.
 */
export function shouldUseDelta({
  hasLocalData,
  lastSyncAt,
  lastFullSyncAt,
  now,
}: {
  hasLocalData: boolean;
  lastSyncAt: string | null;
  lastFullSyncAt: string | null;
  now: number;
}): boolean {
  if (!hasLocalData || !lastSyncAt) return false;
  const lastFullSyncAge = lastFullSyncAt
    ? now - new Date(lastFullSyncAt).getTime()
    : Number.POSITIVE_INFINITY;
  return lastFullSyncAge < FULL_SYNC_MAX_AGE_MS;
}

export async function runCatalogSync() {
  const store = useCatalogSyncStore.getState();
  if (store.isSyncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  store.setSyncing(true);
  store.setError(null);

  try {
    const hasLocalData = Object.keys(store.variants).length > 0;
    const prevShowStock = store.showStock;
    const useDelta = shouldUseDelta({
      hasLocalData,
      lastSyncAt: store.lastSyncAt,
      lastFullSyncAt: store.lastFullSyncAt,
      now: Date.now(),
    });
    const since = useDelta ? store.lastSyncAt : null;
    const url = since
      ? `/api/sync?since=${encodeURIComponent(since)}`
      : "/api/sync";

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Senkron başarısız");

    const payload = await res.json();
    store.applySync(payload);

    if (prevShowStock === false && payload.showStock === true && payload.isDelta) {
      const fullRes = await fetch("/api/sync", { cache: "no-store" });
      if (fullRes.ok) {
        store.applySync(await fullRes.json());
      }
    }

    const pending = useCatalogSyncStore.getState().pendingImageCount;
    if (pending > 0 && isWifiConnection()) {
      void downloadPendingImages();
    }
  } catch (e) {
    store.setError(e instanceof Error ? e.message : "Senkron hatası");
  } finally {
    store.setSyncing(false);
  }
}

export async function downloadPendingImages() {
  if (downloadInFlight) return downloadInFlight;

  downloadInFlight = (async () => {
    const state = useCatalogSyncStore.getState();
    const pending = collectPendingImages(
      state.variants,
      state.families,
      state.imageCache
    );

    if (pending.length === 0) return;

    state.setDownloadingImages(true);
    state.setImageDownloadProgress({ done: 0, total: pending.length });

    try {
      const keys = await cacheImages(pending, (done, total) => {
        useCatalogSyncStore
          .getState()
          .setImageDownloadProgress({ done, total });
      });

      const byKey = new Map(pending.map((p) => [p.key, p]));
      const latest = useCatalogSyncStore.getState();

      for (const key of keys) {
        const item = byKey.get(key);
        if (item) latest.setImageCached(key, item.imageUpdatedAt);
      }
    } finally {
      const latest = useCatalogSyncStore.getState();
      latest.setDownloadingImages(false);
      latest.setImageDownloadProgress(null);
    }
  })();

  try {
    await downloadInFlight;
  } finally {
    downloadInFlight = null;
  }
}

export function startCatalogSyncLoop() {
  runCatalogSync();

  const interval = window.setInterval(runCatalogSync, SYNC_INTERVAL_MS);

  const onVisible = () => {
    if (document.visibilityState === "visible") {
      runCatalogSync();
    }
  };

  const onOnline = () => {
    runCatalogSync();
  };

  // Masaüstünde (ör. tek sekme sürekli açık) visibilitychange ateşlenmez.
  // Gerçek etkileşimde de sync tetikleyelim; 15 dk throttle ile seyrek kalır.
  let lastActivitySync = Date.now();
  const ACTIVITY_THROTTLE_MS = 15 * 60 * 1000;
  const onActivity = () => {
    const now = Date.now();
    if (now - lastActivitySync < ACTIVITY_THROTTLE_MS) return;
    lastActivitySync = now;
    runCatalogSync();
  };

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  window.addEventListener("focus", onActivity);
  window.addEventListener("pointerdown", onActivity, { passive: true });
  window.addEventListener("keydown", onActivity);

  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    window.removeEventListener("focus", onActivity);
    window.removeEventListener("pointerdown", onActivity);
    window.removeEventListener("keydown", onActivity);
  };
}
