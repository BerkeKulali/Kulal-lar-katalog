"use client";

import { useMemo, useState } from "react";
import { BrandHeaderMark } from "@/components/BrandHeaderMark";
import { StickySearchBar } from "@/components/SearchBar";
import { SyncedProductList } from "@/components/SyncedProductList";
import { familyMatchesQuery } from "@/lib/search";
import type { PriceSummary } from "@/lib/prices";
import { EMPTY_STOCK_SUMMARY, hasStock, type StockSummary } from "@/lib/stock";
import { useCatalogSyncStore } from "@/store/catalog-sync";
import { useDisplayPrefsStore } from "@/store/display-prefs";

type FamilyItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  prices: PriceSummary;
  stock?: StockSummary;
};

type BrandGroup = {
  brand: { id: string; slug: string; name: string };
  families: FamilyItem[];
};

export function OlcuCatalogWithSearch({
  groups,
  size,
  aspect,
  gridClass,
  quality,
  kaliteQuery,
}: {
  groups: BrandGroup[];
  size: string;
  aspect: string;
  gridClass: string;
  quality?: "FIRST" | "END";
  kaliteQuery?: string;
}) {
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  const getFamilyStockForSize = useCatalogSyncStore(
    (s) => s.getFamilyStockForSize
  );
  const hasSyncData = useCatalogSyncStore(
    (s) => Object.keys(s.variants).length > 0
  );
  const onlyInStock = useDisplayPrefsStore((s) => s.onlyInStock);

  const filteredGroups = useMemo(() => {
    // Bir ailenin ekranda stoklu sayılıp sayılmayacağı — SyncedProductList'in
    // içindeki aynı senkron-tazelik desenini burada da uygularız, yoksa
    // "sadece stoğu olanlar" açıkken içi SyncedProductList tarafından
    // boşaltılan ama başlığı hâlâ görünen bir marka bölümü kalır.
    const familyHasStock = (family: FamilyItem) => {
      const serverStock = family.stock ?? EMPTY_STOCK_SUMMARY;
      if (!hasSyncData) return hasStock(serverStock);
      const syncedStock = getFamilyStockForSize(family.id, size);
      const hasSyncedStock = syncedStock.first != null || syncedStock.end != null;
      const syncStockIsFresh =
        hasSyncedStock &&
        syncedStock.updatedAt != null &&
        serverStock.updatedAt != null &&
        syncedStock.updatedAt >= serverStock.updatedAt;
      return hasStock(syncStockIsFresh ? syncedStock : serverStock);
    };

    return groups
      .map((group) => ({
        ...group,
        families: group.families
          .filter((family) =>
            isSearching ? familyMatchesQuery(family.name, [], query) : true
          )
          .filter((family) => (onlyInStock ? familyHasStock(family) : true)),
      }))
      .filter((group) => group.families.length > 0);
  }, [groups, query, isSearching, onlyInStock, hasSyncData, getFamilyStockForSize, size]);

  const totalResults = filteredGroups.reduce(
    (sum, group) => sum + group.families.length,
    0
  );

  return (
    <>
      <StickySearchBar value={query} onChange={setQuery} className="mt-1" />

      {isSearching && (
        <p className="mt-3 px-5 text-xs text-zinc-500">
          &quot;{query.trim()}&quot; için {totalResults} sonuç
        </p>
      )}

      {filteredGroups.length === 0 ? (
        <p className="mt-6 px-5 text-center text-sm text-zinc-500">
          {isSearching
            ? "Bu ölçüde eşleşen ürün bulunamadı."
            : "Bu ölçüde henüz ürün bulunamadı."}
        </p>
      ) : (
        <div className="mt-6 space-y-12 px-5">
          {filteredGroups.map((group) => (
            <section key={group.brand.id}>
              <div className="mb-4 flex items-center gap-3">
                <BrandHeaderMark
                  brandSlug={group.brand.slug}
                  brandName={group.brand.name}
                />
                <h2 className="text-sm font-semibold tracking-[0.2em] text-zinc-500">
                  {group.brand.name}
                </h2>
              </div>
              <div className={gridClass}>
                <SyncedProductList
                  families={group.families}
                  brandSlug={group.brand.slug}
                  size={size}
                  aspect={aspect}
                  quality={quality}
                  kaliteQuery={kaliteQuery}
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
