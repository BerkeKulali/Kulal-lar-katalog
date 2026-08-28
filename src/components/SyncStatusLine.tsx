"use client";

import { useCatalogSyncStore } from "@/store/catalog-sync";
import { useDeviceStore } from "@/store/device";

// ProductDetailView.tsx'teki "Stok güncellendi" biçimiyle birebir aynı
// (gün/ay/yıl + saat:dakika, İstanbul saat dilimi) - tutarlı görünüm için.
const STOCK_UPDATED_FMT = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

function formatStockUpdated(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return STOCK_UPDATED_FMT.format(d);
}

export function SyncStatusLine({
  serverPriceDate,
}: {
  serverPriceDate: string;
}) {
  const lastSyncAt = useCatalogSyncStore((s) => s.lastSyncAt);
  const priceListVersion = useCatalogSyncStore((s) => s.priceListVersion);
  const lastStockUpdatedAt = useCatalogSyncStore((s) => s.lastStockUpdatedAt);
  const isSyncing = useCatalogSyncStore((s) => s.isSyncing);
  const lastError = useCatalogSyncStore((s) => s.lastError);
  const pendingImageCount = useCatalogSyncStore((s) => s.pendingImageCount);
  const isDownloadingImages = useCatalogSyncStore((s) => s.isDownloadingImages);
  const imageDownloadProgress = useCatalogSyncStore(
    (s) => s.imageDownloadProgress
  );
  // Bayilerde otomatik görsel indirme kapalı (bkz. sync-client.ts) - o
  // yüzden hiç ilerlemeyecek bir "İndirilmemiş görsel" sayacı göstermeyelim.
  const isDealer = useDeviceStore((s) => s.actorType) === "dealer";

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

  const stockLabel = formatStockUpdated(lastStockUpdatedAt);

  let imageStatus: string | null = null;
  if (!isDealer) {
    if (isDownloadingImages && imageDownloadProgress) {
      const { done, total } = imageDownloadProgress;
      imageStatus = `Görseller indiriliyor: ${done}/${total}`;
    } else if (pendingImageCount > 0) {
      imageStatus = `İndirilmemiş yeni görsel: ${pendingImageCount}`;
    }
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
      {stockLabel && (
        <span className="block text-zinc-600">
          Stok güncellendi: {stockLabel}
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
