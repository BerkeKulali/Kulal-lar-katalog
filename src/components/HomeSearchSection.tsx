"use client";

import { useState } from "react";
import { DisplayPrefsToggle } from "@/components/DisplayPrefsToggle";
import { LiveSearchResults } from "@/components/LiveSearchResults";
import { StickySearchBar } from "@/components/SearchBar";
import type { GlobalSearchItem } from "@/lib/search";

export function HomeSearchSection({
  searchIndex,
  initialShowStock = false,
  children,
}: {
  searchIndex: GlobalSearchItem[];
  initialShowStock?: boolean;
  children: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  return (
    <>
      <StickySearchBar value={query} onChange={setQuery} />
      {isSearching ? (
        <>
          <div className="mt-3 flex justify-end px-5">
            <DisplayPrefsToggle initialShowStock={initialShowStock} />
          </div>
          <LiveSearchResults
            query={query}
            fallbackItems={searchIndex}
            showBrand
          />
        </>
      ) : (
        children
      )}
    </>
  );
}
