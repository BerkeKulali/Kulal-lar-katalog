"use client";

import { useMemo, useState } from "react";
import { LiveSearchResults } from "@/components/LiveSearchResults";
import { StickySearchBar } from "@/components/SearchBar";
import { SyncedProductList } from "@/components/SyncedProductList";
import { familyMatchesQuery } from "@/lib/search";
import type { PriceSummary } from "@/lib/prices";

type FamilyItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  prices: PriceSummary;
};

export function ProductListWithSearch({
  families,
  brandSlug,
  size,
  aspect,
  gridClass,
  quality,
  kaliteQuery,
}: {
  families: FamilyItem[];
  brandSlug: string;
  size: string;
  aspect: string;
  gridClass: string;
  quality?: "FIRST" | "END";
  kaliteQuery?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return families;
    return families.filter((family) =>
      familyMatchesQuery(family.name, [], query)
    );
  }, [families, query]);

  const isSearching = query.trim().length > 0;

  return (
    <>
      <StickySearchBar value={query} onChange={setQuery} className="mt-1" />
      <section className={`mt-8 ${gridClass}`}>
        {isSearching && (
          <p className="col-span-2 text-xs text-zinc-500">
            &quot;{query.trim()}&quot; için {filtered.length} sonuç
          </p>
        )}
        {filtered.length === 0 ? (
          <p className="col-span-2 text-center text-sm text-zinc-500">
            {isSearching
              ? "Bu ölçüde eşleşen ürün bulunamadı."
              : "Bu ölçüde ürün bulunamadı."}
          </p>
        ) : (
          <SyncedProductList
            families={filtered}
            brandSlug={brandSlug}
            size={size}
            aspect={aspect}
            quality={quality}
            kaliteQuery={kaliteQuery}
          />
        )}
      </section>
    </>
  );
}
