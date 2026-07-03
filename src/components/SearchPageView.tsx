"use client";

import { useState } from "react";
import { LiveSearchResults } from "@/components/LiveSearchResults";
import { StickySearchBar } from "@/components/SearchBar";
import type { GlobalSearchItem } from "@/lib/search";

export function SearchPageView({
  searchIndex,
}: {
  searchIndex: GlobalSearchItem[];
}) {
  const [query, setQuery] = useState("");

  return (
    <>
      <StickySearchBar value={query} onChange={setQuery} />
      {!query.trim() ? (
        <p className="mt-8 px-5 text-sm text-zinc-500">
          Yazmaya başlayın — sonuçlar anında filtrelenir.
        </p>
      ) : (
        <LiveSearchResults
          query={query}
          fallbackItems={searchIndex}
          showBrand
        />
      )}
    </>
  );
}
