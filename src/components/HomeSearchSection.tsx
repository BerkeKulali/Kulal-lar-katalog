"use client";

import { useState } from "react";
import { LiveSearchResults } from "@/components/LiveSearchResults";
import { StickySearchBar } from "@/components/SearchBar";
import type { GlobalSearchItem } from "@/lib/search";

export function HomeSearchSection({
  searchIndex,
  children,
}: {
  searchIndex: GlobalSearchItem[];
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  return (
    <>
      <StickySearchBar value={query} onChange={setQuery} />
      {isSearching ? (
        <LiveSearchResults
          query={query}
          fallbackItems={searchIndex}
          showBrand
        />
      ) : (
        children
      )}
    </>
  );
}
