"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SyncFamilyRow, SyncPayload, SyncVariantRow } from "@/lib/sync-types";
import { buildPriceSummary } from "@/lib/prices";
import { pickSizeListImage, toImageCandidates } from "@/lib/product-image";
import type { Quality, Surface } from "@/generated/prisma/client";
import { resolveProductImage } from "@/lib/image-url";

type ImageCacheEntry = {
  imageUpdatedAt: string;
  cachedAt: string;
};

type CatalogSyncState = {
  lastSyncAt: string | null;
  priceListVersion: string | null;
  imageCatalogVersion: string | null;
  showStock: boolean;
  variants: Record<string, SyncVariantRow>;
  families: Record<string, SyncFamilyRow>;
  imageCache: Record<string, ImageCacheEntry>;
  pendingImageCount: number;
  isDownloadingImages: boolean;
  imageDownloadProgress: { done: number; total: number } | null;
  isSyncing: boolean;
  lastError: string | null;

  applySync: (payload: SyncPayload) => void;
  setImageCached: (key: string, imageUpdatedAt: string) => void;
  setPendingImageCount: (count: number) => void;
  setImageDownloadProgress: (
    progress: { done: number; total: number } | null
  ) => void;
  setDownloadingImages: (v: boolean) => void;
  setSyncing: (v: boolean) => void;
  setError: (msg: string | null) => void;

  getVariant: (id: string) => SyncVariantRow | undefined;
  getFamilyPricesForSize: (
    familyId: string,
    size: string
  ) => ReturnType<typeof buildPriceSummary>;
  getFamilyImageForSize: (
    familyId: string,
    size: string
  ) => string | null;
  getFamilyStockForVariant: (variantId: string) => number | undefined;
  getSyncedPrice: (variantId: string) => number | null | undefined;
};

function countPendingImages(
  variants: Record<string, SyncVariantRow>,
  families: Record<string, SyncFamilyRow>,
  imageCache: Record<string, ImageCacheEntry>
) {
  let count = 0;

  for (const f of Object.values(families)) {
    if (!f.imageUrl || !resolveProductImage(f.imageUrl)) continue;
    if (!f.imageUpdatedAt) continue;
    const key = `family:${f.id}`;
    const local = imageCache[key];
    if (!local || local.imageUpdatedAt < f.imageUpdatedAt) count++;
  }

  for (const v of Object.values(variants)) {
    if (!v.imageUrl || !resolveProductImage(v.imageUrl)) continue;
    if (!v.imageUpdatedAt) continue;
    const key = `variant:${v.id}`;
    const local = imageCache[key];
    if (!local || local.imageUpdatedAt < v.imageUpdatedAt) count++;
  }

  return count;
}

export const useCatalogSyncStore = create<CatalogSyncState>()(
  persist(
    (set, get) => ({
      lastSyncAt: null,
      priceListVersion: null,
      imageCatalogVersion: null,
      showStock: true,
      variants: {},
      families: {},
      imageCache: {},
      pendingImageCount: 0,
      isDownloadingImages: false,
      imageDownloadProgress: null,
      isSyncing: false,
      lastError: null,

      applySync: (payload) => {
        set((state) => {
          const showStock = payload.showStock ?? true;
          const variants: Record<string, SyncVariantRow> = payload.isDelta
            ? { ...state.variants }
            : {};
          const families: Record<string, SyncFamilyRow> = payload.isDelta
            ? { ...state.families }
            : {};

          for (const v of payload.variants) {
            variants[v.id] = v;
          }

          for (const f of payload.families) {
            if (f.isActive === false) {
              delete families[f.id];
              for (const [variantId, variant] of Object.entries(variants)) {
                if (variant.familyId === f.id) {
                  delete variants[variantId];
                }
              }
            } else {
              families[f.id] = f;
            }
          }

          for (const [variantId, variant] of Object.entries(variants)) {
            if (!families[variant.familyId]) {
              delete variants[variantId];
            }
          }

          if (!showStock) {
            for (const [variantId, variant] of Object.entries(variants)) {
              if (variant.stockM2 !== 0) {
                variants[variantId] = { ...variant, stockM2: 0 };
              }
            }
          }

          const imageCache = { ...state.imageCache };
          const pendingImageCount = countPendingImages(
            variants,
            families,
            imageCache
          );

          return {
            variants,
            families,
            showStock,
            lastSyncAt: payload.serverTime,
            priceListVersion: payload.priceListVersion,
            imageCatalogVersion: payload.imageCatalogVersion,
            pendingImageCount,
            lastError: null,
          };
        });
      },

      setImageCached: (key, imageUpdatedAt) => {
        set((state) => {
          const imageCache = {
            ...state.imageCache,
            [key]: { imageUpdatedAt, cachedAt: new Date().toISOString() },
          };
          return {
            imageCache,
            pendingImageCount: countPendingImages(
              state.variants,
              state.families,
              imageCache
            ),
          };
        });
      },

      setPendingImageCount: (count) => set({ pendingImageCount: count }),
      setImageDownloadProgress: (imageDownloadProgress) =>
        set({ imageDownloadProgress }),
      setDownloadingImages: (isDownloadingImages) =>
        set({ isDownloadingImages }),
      setSyncing: (isSyncing) => set({ isSyncing }),
      setError: (lastError) => set({ lastError }),

      getVariant: (id) => get().variants[id],

      getSyncedPrice: (id) => get().variants[id]?.price,

      getFamilyStockForVariant: (variantId) =>
        get().variants[variantId]?.stockM2,

      getFamilyPricesForSize: (familyId, size) => {
        const normalized = size.toLowerCase();
        const rows = Object.values(get().variants).filter(
          (v) => v.familyId === familyId && v.size === normalized
        );
        return buildPriceSummary(
          rows.map((v) => ({
            surface: v.surface as Surface,
            quality: v.quality as Quality,
            price: v.price,
          }))
        );
      },

      getFamilyImageForSize: (familyId, size) => {
        const normalized = size.toLowerCase();
        const family = get().families[familyId];
        const rows = Object.values(get().variants).filter(
          (v) => v.familyId === familyId && v.size === normalized
        );
        return pickSizeListImage(
          family?.imageUrl ?? null,
          toImageCandidates(rows),
          normalized
        );
      },
    }),
    // v3: Önceki sürümde admin senkronunda stok 0'a kısılıp localStorage'a
    // yazılıyordu. Sürümü yükseltmek bu bayat önbelleği geçersiz kılar; herkes
    // düzeltilmiş stok mantığıyla temiz bir tam senkron alır.
    { name: "kulalilar-catalog-sync-v3", skipHydration: true }
  )
);
