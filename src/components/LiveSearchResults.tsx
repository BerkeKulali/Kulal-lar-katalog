"use client";

import { useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import { aspectForSize } from "@/lib/constants";
import {
  buildGlobalSearchItems,
  compareSearchItems,
  familyMatchesQuery,
  itemMatchesAttributes,
  type GlobalSearchItem,
} from "@/lib/search";
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
  const families = useCatalogSyncStore((s) => s.families);
  const variants = useCatalogSyncStore((s) => s.variants);
  const getFamilyPricesForSize = useCatalogSyncStore(
    (s) => s.getFamilyPricesForSize
  );
  const hasSyncData = useCatalogSyncStore(
    (s) => Object.keys(s.families).length > 0
  );

  const items = useMemo(() => {
    if (hasSyncData) {
      return buildGlobalSearchItems(families, variants);
    }
    return fallbackItems;
  }, [fallbackItems, families, hasSyncData, variants]);

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
