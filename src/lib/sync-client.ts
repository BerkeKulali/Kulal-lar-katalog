import {
  cacheImages,
  collectPendingImages,
  isWifiConnection,
} from "@/lib/offline-images";
import { SYNC_INTERVAL_MS } from "@/lib/sync-types";
import { useCatalogSyncStore } from "@/store/catalog-sync";

let downloadInFlight: Promise<void> | null = null;

export async function runCatalogSync() {
  const store = useCatalogSyncStore.getState();
  if (store.isSyncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  store.setSyncing(true);
  store.setError(null);

  try {
    const hasLocalData = Object.keys(store.variants).length > 0;
    const since = hasLocalData ? store.lastSyncAt : null;
    const url = since
      ? `/api/sync?since=${encodeURIComponent(since)}`
      : "/api/sync";

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Senkron başarısız");

    const payload = await res.json();
    store.applySync(payload);

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

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);

  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
  };
}
