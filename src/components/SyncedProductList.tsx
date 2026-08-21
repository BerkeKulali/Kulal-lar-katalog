"use client";

import { useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useCatalogSyncStore } from "@/store/catalog-sync";
import { useDisplayPrefsStore } from "@/store/display-prefs";
import type { PriceSummary } from "@/lib/prices";
import { EMPTY_STOCK_SUMMARY, hasStock, type StockSummary } from "@/lib/stock";

type FamilyItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  prices: PriceSummary;
  stock?: StockSummary;
};

export function SyncedProductList({
  families,
  brandSlug,
  size,
  aspect,
  quality,
  kaliteQuery,
}: {
  families: FamilyItem[];
  brandSlug: string;
  size: string;
  aspect: string;
  quality?: "FIRST" | "END";
  kaliteQuery?: string;
}) {
  const getFamilyPricesForSize = useCatalogSyncStore(
    (s) => s.getFamilyPricesForSize
  );
  const getFamilyStockForSize = useCatalogSyncStore(
    (s) => s.getFamilyStockForSize
  );
  const getFamilyImageForSize = useCatalogSyncStore(
    (s) => s.getFamilyImageForSize
  );
  const hasSyncData = useCatalogSyncStore(
    (s) => Object.keys(s.variants).length > 0
  );
  const onlyInStock = useDisplayPrefsStore((s) => s.onlyInStock);

  const items = useMemo(() => {
    const merged = families.map((family) => {
      if (!hasSyncData) return family;
      const synced = getFamilyPricesForSize(family.id, size);
      const mergedPrices = {
        first: {
          ...family.prices.first,
          ...synced.first,
        },
        end: {
          ...family.prices.end,
          ...synced.end,
        },
      };
      // Stok: senkron mağazasındaki değer sunucunun kendi (taze) SSR
      // değerinden DAHA ESKİ olabilir — ör. cihaz uzun süredir aynı sekmede
      // açık, arka plan senkronu henüz bir stok güncellemesini (ör. Netsis
      // içe aktarımı) yakalamamış olabilir. Bu yüzden körlemesine "senkron
      // verisi varsa onu kullan" yapılmaz — ProductDetailView'daki aynı
      // desenle, `updatedAt` karşılaştırılıp yalnızca senkron verisi
      // sunucununkinden daha eski DEĞİLSE tercih edilir.
      const syncedStock = getFamilyStockForSize(family.id, size);
      const serverStock = family.stock ?? EMPTY_STOCK_SUMMARY;
      const hasSyncedStock =
        syncedStock.first != null || syncedStock.end != null;
      const syncStockIsFresh =
        hasSyncedStock &&
        syncedStock.updatedAt != null &&
        serverStock.updatedAt != null &&
        syncedStock.updatedAt >= serverStock.updatedAt;
      const mergedStock = syncStockIsFresh ? syncedStock : serverStock;
      const syncedImage = getFamilyImageForSize(family.id, size);
      return {
        ...family,
        prices: mergedPrices,
        stock: mergedStock,
        imageUrl: syncedImage ?? family.imageUrl,
      };
    });

    return onlyInStock
      ? merged.filter((family) => hasStock(family.stock ?? EMPTY_STOCK_SUMMARY))
      : merged;
  }, [
    families,
    getFamilyPricesForSize,
    getFamilyStockForSize,
    getFamilyImageForSize,
    hasSyncData,
    onlyInStock,
    size,
  ]);

  return (
    <>
      {items.map((family) => (
        <ProductCard
          key={family.id}
          href={`/katalog/${brandSlug}/${size}/${family.slug}${kaliteQuery ? `?${kaliteQuery}` : ""}`}
          name={family.name}
          imageUrl={family.imageUrl}
          prices={family.prices}
          stock={family.stock}
          aspect={aspect}
          size={size}
          quality={quality === "END" ? "END" : undefined}
        />
      ))}
    </>
  );
}
