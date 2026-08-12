"use client";

import { useState } from "react";
import { DisplayPrefsToggle } from "@/components/DisplayPrefsToggle";
import { LiveSearchResults } from "@/components/LiveSearchResults";
import { StickySearchBar } from "@/components/SearchBar";
import { SearchFilterChips } from "@/components/SearchFilterChips";
import type { GlobalSearchItem } from "@/lib/search";

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

  const active = query.trim().length > 0 || Boolean(color) || Boolean(materialType);

  return (
    <>
      <StickySearchBar value={query} onChange={setQuery} />
      <SearchFilterChips
        color={color}
        materialType={materialType}
        onColor={setColor}
        onMaterialType={setMaterialType}
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
            fallbackItems={searchIndex}
            showBrand
          />
        </>
      ) : (
        <p className="mt-8 px-5 text-sm text-zinc-500">
          Yazmaya başlayın ya da yukarıdan tip/renk seçin — sonuçlar anında
          filtrelenir.
        </p>
      )}
    </>
  );
}
