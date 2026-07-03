"use client";

import { useCatalogSyncStore } from "@/store/catalog-sync";

export function SyncStatusLine({
  serverPriceDate,
}: {
  serverPriceDate: string;
}) {
  const lastSyncAt = useCatalogSyncStore((s) => s.lastSyncAt);
  const priceListVersion = useCatalogSyncStore((s) => s.priceListVersion);
  const isSyncing = useCatalogSyncStore((s) => s.isSyncing);
  const lastError = useCatalogSyncStore((s) => s.lastError);
  const pendingImageCount = useCatalogSyncStore((s) => s.pendingImageCount);
  const isDownloadingImages = useCatalogSyncStore((s) => s.isDownloadingImages);
  const imageDownloadProgress = useCatalogSyncStore(
    (s) => s.imageDownloadProgress
  );

  const displayDate = priceListVersion
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(priceListVersion))
    : serverPriceDate;

  const syncLabel = lastSyncAt
    ? new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(lastSyncAt))
    : null;

  let imageStatus: string | null = null;
  if (isDownloadingImages && imageDownloadProgress) {
    const { done, total } = imageDownloadProgress;
    imageStatus = `Görseller indiriliyor: ${done}/${total}`;
  } else if (pendingImageCount > 0) {
    imageStatus = `İndirilmemiş yeni görsel: ${pendingImageCount}`;
  }

  return (
    <p className="text-center text-xs text-zinc-500">
      Fiyat listesi: {displayDate}
      {syncLabel && (
        <span className="text-zinc-600">
          {" "}
          · Senkron {syncLabel}
          {isSyncing ? " …" : ""}
        </span>
      )}
      {imageStatus && (
        <span className="block text-amber-400/90">{imageStatus}</span>
      )}
      {lastError && (
        <span className="block text-red-400/80">Senkron: {lastError}</span>
      )}
    </p>
  );
}
