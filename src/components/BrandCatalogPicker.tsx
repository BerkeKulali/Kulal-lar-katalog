"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { formatSizeLabel } from "@/lib/constants";
import {
  kaliteFilterLabel,
  kaliteQuery,
  parseKaliteFilter,
  qualityLabel,
  type CatalogQualityFilter,
} from "@/lib/utils";
import type { Quality } from "@/generated/prisma/client";

const QUALITY_OPTIONS: CatalogQualityFilter[] = ["ALL", "FIRST", "END"];

export function BrandCatalogPicker({
  brandSlug,
  sizes,
  availableQualities,
}: {
  brandSlug: string;
  sizes: string[];
  availableQualities: Quality[];
}) {
  const searchParams = useSearchParams();
  const initialFromUrl = parseKaliteFilter(searchParams.get("kalite"));
  const [quality, setQuality] = useState<CatalogQualityFilter>(initialFromUrl);

  const qualitySet = useMemo(
    () => new Set(availableQualities),
    [availableQualities]
  );

  const selectQuality = useCallback((next: CatalogQualityFilter) => {
    setQuality(next);
  }, []);

  const sizeHref = useCallback(
    (size: string) =>
      `/katalog/${brandSlug}/${size}?${kaliteQuery(quality)}`,
    [brandSlug, quality]
  );

  if (sizes.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500">
        Bu marka için henüz ürün eklenmedi.
      </p>
    );
  }

  return (
    <div className="catalog-picker">
      <section className="catalog-picker-section">
        <h2 className="catalog-picker-heading">KALİTE SEÇİN</h2>
        <div className="catalog-picker-grid">
          {QUALITY_OPTIONS.map((option) => {
            const available =
              option === "ALL" || qualitySet.has(option as Quality);
            const active = quality === option;
            const label =
              option === "ALL"
                ? kaliteFilterLabel("ALL")
                : qualityLabel(option as Quality);
            return (
              <button
                key={option}
                type="button"
                disabled={!available}
                onClick={() => selectQuality(option)}
                className={`catalog-picker-chip${active ? " catalog-picker-chip--active" : ""}${!available ? " catalog-picker-chip--disabled" : ""}`}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="catalog-picker-section">
        <h2 className="catalog-picker-heading">ÖLÇÜ SEÇİN</h2>
        <div className="catalog-picker-grid">
          {sizes.map((size) => (
            <Link
              key={size}
              href={sizeHref(size)}
              className="catalog-picker-chip"
            >
              {formatSizeLabel(size)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
