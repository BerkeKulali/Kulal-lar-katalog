import Link from "next/link";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { AppShell } from "@/components/AppShell";
import { CatalogSizeHeader } from "@/components/CatalogSizeHeader";
import { DeviceGate } from "@/components/DeviceGate";
import { OlcuCatalogWithSearch } from "@/components/OlcuCatalogWithSearch";
import { SiteHeader } from "@/components/SiteHeader";
import { getSizeLayout, normalizeSize } from "@/lib/constants";
import { getCatalogFamiliesGroupedByBrand } from "@/lib/catalog";
import { kaliteFilterLabel, kaliteQuery, parseKaliteFilter } from "@/lib/utils";
import type { Quality } from "@/generated/prisma/client";

export default async function SizeCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ size: string }>;
  searchParams: Promise<{ kalite?: string }>;
}) {
  const { size: sizeParam } = await params;
  const { kalite } = await searchParams;
  const size = normalizeSize(sizeParam);
  const kaliteFilter = parseKaliteFilter(kalite);
  const qualityForQuery =
    kaliteFilter === "ALL" ? undefined : (kaliteFilter as Quality);

  const audience = await getCatalogAudienceFromCookies();
  const groups = await getCatalogFamiliesGroupedByBrand(
    size,
    qualityForQuery,
    audience
  );
  const layout = getSizeLayout(size);
  const gridClass =
    layout.columns === 2
      ? "catalog-grid-2 grid grid-cols-2 gap-8"
      : "catalog-list-single flex flex-col gap-10";

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <CatalogSizeHeader
          backHref="/katalog"
          backLabel="Markalar"
          size={size}
        />

        <section className="catalog-quality-row mb-2 mt-2 flex flex-wrap justify-center gap-2 px-5">
          {(["ALL", "FIRST", "END"] as const).map((filter) => (
            <Link
              key={filter}
              href={`/katalog/olcu/${size}?${kaliteQuery(filter)}`}
              className={`catalog-picker-chip catalog-quality-chip${kaliteFilter === filter ? " catalog-picker-chip--active" : ""}`}
            >
              {kaliteFilterLabel(filter)}
            </Link>
          ))}
        </section>

        <OlcuCatalogWithSearch
          groups={groups}
          size={size}
          aspect={layout.aspect}
          gridClass={gridClass}
          quality={qualityForQuery}
          kaliteQuery={kaliteQuery(kaliteFilter)}
        />
      </AppShell>
    </DeviceGate>
  );
}
