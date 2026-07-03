"use client";

import { useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import { useCatalogSyncStore } from "@/store/catalog-sync";
import type { PriceSummary } from "@/lib/prices";

type FamilyItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  prices: PriceSummary;
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
  const getFamilyImageForSize = useCatalogSyncStore(
    (s) => s.getFamilyImageForSize
  );
  const hasSyncData = useCatalogSyncStore(
    (s) => Object.keys(s.variants).length > 0
  );

  const items = useMemo(() => {
    if (!hasSyncData) return families;
    return families.map((family) => {
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
      const syncedImage = getFamilyImageForSize(family.id, size);
      return {
        ...family,
        prices: mergedPrices,
        imageUrl: syncedImage ?? family.imageUrl,
      };
    });
  }, [
    families,
    getFamilyPricesForSize,
    getFamilyImageForSize,
    hasSyncData,
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
          aspect={aspect}
          size={size}
          quality={quality === "END" ? "END" : undefined}
        />
      ))}
    </>
  );
}
