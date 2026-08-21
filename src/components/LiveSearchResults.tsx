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
import { EMPTY_STOCK_SUMMARY } from "@/lib/stock";
import { useCatalogSyncStore } from "@/store/catalog-sync";

export function LiveSearchResults({
  query,
  color = null,
  materialType = null,
  fallbackItems = [],
  className = "mt-8 catalog-grid-2 grid grid-cols-2 gap-6 px-5",
  showBrand = false,
}: {
  query: string;
  color?: string | null;
  materialType?: string | null;
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
  const hasFilter = hasQuery || Boolean(color) || Boolean(materialType);

  const filtered = useMemo(() => {
    if (!hasFilter) return [];
    return items
      .filter((item) => familyMatchesQuery(item.name, item.codes, query))
      .filter((item) => itemMatchesAttributes(item, color, materialType))
      .sort(compareSearchItems);
  }, [items, query, color, materialType, hasFilter]);

  if (!hasFilter) return null;

  return (
    <section className={className}>
      <p className="col-span-2 text-xs text-zinc-500">
        {hasQuery ? `"${query.trim()}" için ` : ""}
        {filtered.length} sonuç
      </p>
      {filtered.length === 0 ? (
        <p className="col-span-2 py-8 text-center text-sm text-zinc-500">
          Eşleşen ürün bulunamadı.
        </p>
      ) : (
        filtered.map((family) => {
          const synced = hasSyncData
            ? getFamilyPricesForSize(family.familyId, family.size)
            : { first: {}, end: {} };
          const prices = {
            first: { ...family.prices.first, ...synced.first },
            end: { ...family.prices.end, ...synced.end },
          };

          // Stok: senkron mağazasındaki değer, sunucunun kendi taze SSR
          // değerinden daha eski olabilir (cihaz uzun süredir aynı sekmede
          // açık, arka plan senkronu henüz bir stok güncellemesini
          // yakalamamış olabilir) — bu yüzden yalnızca senkron verisi
          // sunucununkinden daha eski DEĞİLSE tercih edilir.
          const syncedStock = hasSyncData
            ? getFamilyStockForSize(family.familyId, family.size)
            : EMPTY_STOCK_SUMMARY;
          const serverStock = family.stock ?? EMPTY_STOCK_SUMMARY;
          const hasSyncedStock =
            syncedStock.first != null || syncedStock.end != null;
          const syncStockIsFresh =
            hasSyncedStock &&
            syncedStock.updatedAt != null &&
            serverStock.updatedAt != null &&
            syncedStock.updatedAt >= serverStock.updatedAt;
          const stock = syncStockIsFresh ? syncedStock : serverStock;

          return (
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
          );
        })
      )}
    </section>
  );
}
