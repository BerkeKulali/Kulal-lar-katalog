"use client";

import { useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import { aspectForSize } from "@/lib/constants";
import {
  compareSearchItems,
  familyMatchesQuery,
  itemMatchesAttributes,
  type GlobalSearchItem,
} from "@/lib/search";
import { EMPTY_STOCK_SUMMARY, hasStock, type StockSummary } from "@/lib/stock";
import type { PriceSummary } from "@/lib/prices";
import { useCatalogSyncStore } from "@/store/catalog-sync";
import { useDisplayPrefsStore } from "@/store/display-prefs";

type MergedResult = {
  item: GlobalSearchItem;
  prices: PriceSummary;
  stock: StockSummary;
};

export function LiveSearchResults({
  query,
  color = null,
  materialType = null,
  size = null,
  brandSlug = null,
  fallbackItems = [],
  className = "mt-8 catalog-grid-2 grid grid-cols-2 gap-6 px-5",
  showBrand = false,
}: {
  query: string;
  color?: string | null;
  materialType?: string | null;
  size?: string | null;
  brandSlug?: string | null;
  fallbackItems?: GlobalSearchItem[];
  className?: string;
  showBrand?: boolean;
}) {
  const getFamilyPricesForSize = useCatalogSyncStore(
    (s) => s.getFamilyPricesForSize
  );
  const getFamilyStockForSize = useCatalogSyncStore(
    (s) => s.getFamilyStockForSize
  );
  const hasSyncData = useCatalogSyncStore(
    (s) => Object.keys(s.families).length > 0
  );
  const onlyInStock = useDisplayPrefsStore((s) => s.onlyInStock);

  // Öğe kümesi ve isim/renk/tip gibi editoryal alanlar HER ZAMAN sunucudan
  // gelen (SSR, unstable_cache + admin mutasyonunda invalidate edilen) taze
  // `fallbackItems`e dayanır. Önceden burada `hasSyncData` true olduğu anda
  // TÜM öğe listesi istemcinin senkron mağazasından (`buildGlobalSearchItems`)
  // yeniden kuruluyordu — mağaza yalnızca periyodik/arka planda senkronlanan
  // yerel bir önbellek olduğundan, bir admin renk/tip gibi bir alanı toplu
  // güncellediğinde (ör. materialType="ahşap") kullanıcının cihazındaki eski
  // önbellek verisi doğru SSR sonucunun üstüne yazıyor, "hard refresh'te bir
  // an doğru sonuç görünüp sonra yanlışa dönme" şeklinde gözlemlenen hataya
  // yol açıyordu. Fiyat ve stok gibi gerçek-zamanlı/sık değişen alanlar ise
  // aşağıda ProductDetailView/SyncedProductList ile aynı desenle, öğe bazında
  // ve (stok için) tazelik kontrolüyle senkron mağazasından bindirilir.
  const items = fallbackItems;

  const hasQuery = query.trim().length > 0;
  const hasFilter =
    hasQuery || Boolean(color) || Boolean(materialType) || Boolean(size) || Boolean(brandSlug);

  const results = useMemo<MergedResult[]>(() => {
    if (!hasFilter) return [];

    const matched = items
      .filter((item) => familyMatchesQuery(item.name, item.codes, query))
      .filter((item) => itemMatchesAttributes(item, { color, materialType, size, brandSlug }))
      .sort(compareSearchItems);

    const merged = matched.map((item) => {
      const synced = hasSyncData
        ? getFamilyPricesForSize(item.familyId, item.size)
        : { first: {}, end: {} };
      const prices = {
        first: { ...item.prices.first, ...synced.first },
        end: { ...item.prices.end, ...synced.end },
      };

      // Stok: senkron mağazasındaki değer, sunucunun kendi taze SSR
      // değerinden daha eski olabilir (cihaz uzun süredir aynı sekmede
      // açık, arka plan senkronu henüz bir stok güncellemesini
      // yakalamamış olabilir) — bu yüzden yalnızca senkron verisi
      // sunucununkinden daha eski DEĞİLSE tercih edilir.
      const syncedStock = hasSyncData
        ? getFamilyStockForSize(item.familyId, item.size)
        : EMPTY_STOCK_SUMMARY;
      const serverStock = item.stock ?? EMPTY_STOCK_SUMMARY;
      const hasSyncedStock = syncedStock.first != null || syncedStock.end != null;
      const syncStockIsFresh =
        hasSyncedStock &&
        syncedStock.updatedAt != null &&
        serverStock.updatedAt != null &&
        syncedStock.updatedAt >= serverStock.updatedAt;
      const stock = syncStockIsFresh ? syncedStock : serverStock;

      return { item, prices, stock };
    });

    return onlyInStock ? merged.filter((r) => hasStock(r.stock)) : merged;
  }, [
    items,
    query,
    color,
    materialType,
    size,
    brandSlug,
    hasFilter,
    hasSyncData,
    getFamilyPricesForSize,
    getFamilyStockForSize,
    onlyInStock,
  ]);

  if (!hasFilter) return null;

  return (
    <section className={className}>
      <p className="col-span-2 text-xs text-zinc-500">
        {hasQuery ? `"${query.trim()}" için ` : ""}
        {results.length} sonuç
      </p>
      {results.length === 0 ? (
        <p className="col-span-2 py-8 text-center text-sm text-zinc-500">
          Eşleşen ürün bulunamadı.
        </p>
      ) : (
        results.map(({ item: family, prices, stock }) => (
          <div key={family.id}>
            {showBrand && family.brandName && (
              <p className="mb-1 text-center text-[10px] text-zinc-500">
                {family.brandName}
              </p>
            )}
            <ProductCard
              href={`/katalog/${family.brandSlug}/${family.size}/${family.slug}`}
              name={`${family.name} · ${family.size.toUpperCase()}`}
              imageUrl={family.imageUrl}
              prices={prices}
              stock={stock}
              aspect={aspectForSize(family.size)}
              size={family.size}
            />
          </div>
        ))
      )}
    </section>
  );
}
