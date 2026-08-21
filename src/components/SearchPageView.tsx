"use client";

import { useMemo, useState } from "react";
import { DisplayPrefsToggle } from "@/components/DisplayPrefsToggle";
import { LiveSearchResults } from "@/components/LiveSearchResults";
import { StickySearchBar } from "@/components/SearchBar";
import { SearchFilterChips, type SearchFilterOption } from "@/components/SearchFilterChips";
import { formatSizeDisplay } from "@/lib/constants";
import { sortSizes, type GlobalSearchItem } from "@/lib/search";

export function SearchPageView({
  searchIndex,
  initialColor = null,
  initialMaterialType = null,
  initialShowStock = false,
}: {
  searchIndex: GlobalSearchItem[];
  initialColor?: string | null;
  initialMaterialType?: string | null;
  initialShowStock?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<string | null>(initialColor);
  const [materialType, setMaterialType] = useState<string | null>(
    initialMaterialType
  );
  const [size, setSize] = useState<string | null>(null);
  const [brandSlug, setBrandSlug] = useState<string | null>(null);

  // Ebat/marka çip seçenekleri, katalogda gerçekten var olan değerlerden
  // türetilir (renk/tip gibi sabit bir liste yerine) — böylece hiç ürünü
  // olmayan bir ebat/marka çip olarak görünmez.
  const sizeOptions: SearchFilterOption[] = useMemo(() => {
    const sizes = sortSizes([...new Set(searchIndex.map((item) => item.size))]);
    return sizes.map((s) => ({ id: s, label: formatSizeDisplay(s) }));
  }, [searchIndex]);

  const brandOptions: SearchFilterOption[] = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of searchIndex) {
      if (!byId.has(item.brandSlug)) {
        byId.set(item.brandSlug, item.brandName ?? item.brandSlug.toUpperCase());
      }
    }
    return [...byId.entries()].map(([id, label]) => ({ id, label }));
  }, [searchIndex]);

  const active =
    query.trim().length > 0 ||
    Boolean(color) ||
    Boolean(materialType) ||
    Boolean(size) ||
    Boolean(brandSlug);

  return (
    <>
      <StickySearchBar value={query} onChange={setQuery} />
      <SearchFilterChips
        color={color}
        materialType={materialType}
        size={size}
        brandSlug={brandSlug}
        sizeOptions={sizeOptions}
        brandOptions={brandOptions}
        onColor={setColor}
        onMaterialType={setMaterialType}
        onSize={setSize}
        onBrandSlug={setBrandSlug}
      />
      {active ? (
        <>
          <div className="mt-3 flex justify-end px-5">
            <DisplayPrefsToggle initialShowStock={initialShowStock} />
          </div>
          <LiveSearchResults
            query={query}
            color={color}
            materialType={materialType}
            size={size}
            brandSlug={brandSlug}
            fallbackItems={searchIndex}
            showBrand
          />
        </>
      ) : (
        <p className="mt-8 px-5 text-sm text-zinc-500">
          Yazmaya başlayın ya da yukarıdan tip/renk/ebat/marka seçin —
          sonuçlar anında filtrelenir.
        </p>
      )}
    </>
  );
}
