"use client";

import { downloadPendingImages } from "@/lib/sync-client";
import { useCatalogSyncStore } from "@/store/catalog-sync";

export function ImageUpdateBanner() {
  const pendingImageCount = useCatalogSyncStore((s) => s.pendingImageCount);
  const isDownloadingImages = useCatalogSyncStore((s) => s.isDownloadingImages);
  const imageDownloadProgress = useCatalogSyncStore(
    (s) => s.imageDownloadProgress
  );

  if (pendingImageCount === 0 && !isDownloadingImages) return null;

  async function handleDownload() {
    await downloadPendingImages();
  }

  if (isDownloadingImages && imageDownloadProgress) {
    const { done, total } = imageDownloadProgress;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
      <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs">
        <div className="flex items-center justify-between gap-3">
          <p className="text-zinc-300">
            Görseller indiriliyor: {done}/{total}
          </p>
          <span className="text-zinc-500">{pct}%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-amber-500 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs">
      <p className="text-zinc-400">
        İndirilmemiş yeni görsel:{" "}
        <span className="font-semibold text-amber-300">{pendingImageCount}</span>
      </p>
      <button
        type="button"
        onClick={() => void handleDownload()}
        className="shrink-0 border border-zinc-600 px-3 py-1.5 font-semibold text-zinc-200 hover:border-amber-400 hover:text-amber-200"
      >
        İndir
      </button>
    </div>
  );
}
