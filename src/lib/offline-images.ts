import { optimizeCatalogImage } from "@/lib/image-url";
import { tileImageProfile } from "@/lib/tile-image-profile";
import type { SyncFamilyRow, SyncVariantRow } from "@/lib/sync-types";

/**
 * Görsel cache adı. public/sw.js içindeki IMAGE_CACHE ile aynı olmalı;
 * ikisi de aynı cache'e yazıyor.
 */
export const IMAGE_CACHE_NAME = "kulalilar-images-v1";

export function isWifiConnection() {
  if (typeof navigator === "undefined") return false;
  const conn = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; type?: string };
    }
  ).connection;
  if (!conn) return true;
  if (conn.type === "wifi" || conn.type === "ethernet") return true;
  return conn.effectiveType === "4g" || conn.effectiveType === "3g";
}

export type PendingImage = {
  key: string;
  url: string;
  imageUpdatedAt: string;
};

export function collectPendingImages(
  variants: Record<string, SyncVariantRow>,
  families: Record<string, SyncFamilyRow>,
  imageCache: Record<string, { imageUpdatedAt: string }>
): PendingImage[] {
  const pending: PendingImage[] = [];

  for (const f of Object.values(families)) {
    if (!f.imageUrl || f.imageUrl.startsWith("color:") || !f.imageUpdatedAt)
      continue;
    const key = `family:${f.id}`;
    const local = imageCache[key];
    if (!local || local.imageUpdatedAt < f.imageUpdatedAt) {
      pending.push({
        key,
        url: optimizeCatalogImage(
          f.imageUrl,
          tileImageProfile(undefined, "list").cloudWidth
        ),
        imageUpdatedAt: f.imageUpdatedAt,
      });
    }
  }

  for (const v of Object.values(variants)) {
    if (!v.imageUrl || v.imageUrl.startsWith("color:") || !v.imageUpdatedAt)
      continue;
    const key = `variant:${v.id}`;
    const local = imageCache[key];
    if (!local || local.imageUpdatedAt < v.imageUpdatedAt) {
      pending.push({
        key,
        url: optimizeCatalogImage(
          v.imageUrl,
          tileImageProfile(v.size, "list").cloudWidth
        ),
        imageUpdatedAt: v.imageUpdatedAt,
      });
    }
  }

  const seen = new Set<string>();
  return pending.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
}

export async function cacheImages(
  items: PendingImage[],
  onProgress?: (done: number, total: number) => void
) {
  if (!("caches" in window)) return [];

  const cache = await caches.open(IMAGE_CACHE_NAME);
  let done = 0;
  const cachedKeys: string[] = [];

  for (const item of items) {
    try {
      const res = await fetch(item.url, { mode: "cors", cache: "reload" });
      if (res.ok) {
        await cache.put(item.url, res);
        cachedKeys.push(item.key);
      }
    } catch {
      // network error — skip
    }
    done++;
    onProgress?.(done, items.length);
  }

  return cachedKeys;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // ignore
  }
}
