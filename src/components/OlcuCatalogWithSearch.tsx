"use client";

import { useMemo, useState } from "react";
import { BrandHeaderMark } from "@/components/BrandHeaderMark";
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

  const filteredGroups = useMemo(() => {
    if (!isSearching) return groups;
    return groups
      .map((group) => ({
        ...group,
        families: group.families.filter((family) =>
          familyMatchesQuery(family.name, [], query)
        ),
      }))
      .filter((group) => group.families.length > 0);
  }, [groups, query, isSearching]);

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
