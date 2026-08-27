"use client";

import { useMemo, useState } from "react";
import { CatalogSizeHeader } from "@/components/CatalogSizeHeader";
import { DisplayPrefsToggle } from "@/components/DisplayPrefsToggle";
import { StickySearchBar } from "@/components/SearchBar";
import { SyncedProductList } from "@/components/SyncedProductList";
import { familyMatchesQuery } from "@/lib/search";
import { formatSizeLabel } from "@/lib/constants";
import type { PriceSummary } from "@/lib/prices";
import type { StockSummary } from "@/lib/stock";

type FamilyItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  prices: PriceSummary;
  stock?: StockSummary;
};

type SizeSection = {
  size: string;
  aspect: string;
  gridClass: string;
  families: FamilyItem[];
};

/**
 * "/katalog/{brand}/tumu" sayfasının tüm istemci tarafı: başlık + Fiyatlı/
 * Stoklu/Sadece Stoklu + Ebat filtresi düğmesi + arama + ölçüye göre
 * gruplanmış ürün listeleri. Tek bileşende toplanmasının sebebi: "Ebat
 * filtresi" tetikleyicisi (başlığın sağında) ile aşağıdaki listelerin aynı
 * seçili-ebat state'ini paylaşması gerekiyor - ikisi de sunucu bileşeninde
 * kardeş slot'lar olduğu için state'i burada, tek yerde tutuyoruz.
 *
 * Ebat seçimi TAMAMEN istemci tarafında filtreler (sayfa yenilenmez) -
 * "Sadece Stoklu" ile aynı davranış. Veri zaten her ölçü için sunucuda
 * toplanıp buraya prop olarak geldiği için ek bir istek gerekmiyor.
 */
export function AllSizesProductList({
  sections,
  brandSlug,
  brandName,
  backHref,
  qualityLabel,
  quality,
  kaliteQuery,
  showStock,
}: {
  sections: SizeSection[];
  brandSlug: string;
  brandName: string;
  backHref: string;
  qualityLabel?: string;
  quality?: "FIRST" | "END";
  kaliteQuery?: string;
  showStock: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  function toggleSize(size: string) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  }

  const visibleSections = useMemo(() => {
    const q = query.trim();
    return sections
      .filter(
        (section) =>
          selectedSizes.length === 0 || selectedSizes.includes(section.size)
      )
      .map((section) => ({
        ...section,
        families: q
          ? section.families.filter((f) => familyMatchesQuery(f.name, [], q))
          : section.families,
      }))
      .filter((section) => section.families.length > 0);
  }, [sections, selectedSizes, query]);

  const isSearching = query.trim().length > 0;
  const isFiltered = isSearching || selectedSizes.length > 0;
  const totalCount = visibleSections.reduce(
    (sum, s) => sum + s.families.length,
    0
  );

  return (
    <>
      <CatalogSizeHeader
        backHref={backHref}
        size="tumu"
        sizeLabel="TÜMÜ"
        qualityLabel={qualityLabel}
        brandSlug={brandSlug}
        brandName={brandName}
        right={
          <div className="display-prefs-toggle">
            <DisplayPrefsToggle initialShowStock={showStock} />
            {sections.length > 1 && (
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={filterOpen}
                className={`theme-chip theme-chip--sm${selectedSizes.length > 0 ? " theme-chip--active" : ""}`}
              >
                Ebat filtresi
                {selectedSizes.length > 0 ? ` (${selectedSizes.length})` : ""}
              </button>
            )}
          </div>
        }
      />

      <StickySearchBar value={query} onChange={setQuery} className="mt-1" />

      <section className="mt-8">
        {isSearching && (
          <p className="px-5 text-xs text-zinc-500">
            &quot;{query.trim()}&quot; için {totalCount} sonuç
          </p>
        )}

        {visibleSections.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            {isFiltered
              ? "Bu kriterlere uyan ürün yok."
              : "Bu markada henüz ürün eklenmedi."}
          </p>
        ) : (
          visibleSections.map((section) => (
            <div key={section.size} className="mt-10 first:mt-0">
              <h2 className="px-5 text-center text-xs font-semibold tracking-[0.3em] text-zinc-500">
                {formatSizeLabel(section.size)}
              </h2>
              <div className={`mt-4 ${section.gridClass}`}>
                <SyncedProductList
                  families={section.families}
                  brandSlug={brandSlug}
                  size={section.size}
                  aspect={section.aspect}
                  quality={quality}
                  kaliteQuery={kaliteQuery}
                />
              </div>
            </div>
          ))
        )}
      </section>

      {filterOpen && (
        <SizeFilterModal
          sizes={sections.map((s) => s.size)}
          selected={selectedSizes}
          onToggle={toggleSize}
          onClear={() => setSelectedSizes([])}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </>
  );
}

function SizeFilterModal({
  sizes,
  selected,
  onToggle,
  onClear,
  onClose,
}: {
  sizes: string[];
  selected: string[];
  onToggle: (size: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-main-bg)] p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ebat filtresi"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-[var(--foreground)]">
            Ebat filtresi
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-lg leading-none text-zinc-500"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <div className="catalog-picker-grid">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={selected.includes(size)}
              onClick={() => onToggle(size)}
              className={`catalog-picker-chip${selected.includes(size) ? " catalog-picker-chip--active" : ""}`}
            >
              {formatSizeLabel(size)}
            </button>
          ))}
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="mt-4 text-xs text-zinc-500 underline"
          >
            Tümünü göster
          </button>
        )}
      </div>
    </div>
  );
}
