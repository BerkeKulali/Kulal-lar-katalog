import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CatalogSizeHeader } from "@/components/CatalogSizeHeader";
import { DeviceGate } from "@/components/DeviceGate";
import { ProductListWithSearch } from "@/components/ProductListWithSearch";
import { SiteHeader } from "@/components/SiteHeader";
import { getSizeLayout, normalizeSize } from "@/lib/constants";
import { getBrandBySlug, getCatalogFamilies } from "@/lib/catalog";
import { kaliteFilterLabel, kaliteQuery, parseKaliteFilter } from "@/lib/utils";
import type { Quality } from "@/generated/prisma/client";

export default async function ProductListPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; size: string }>;
  searchParams: Promise<{ kalite?: string }>;
}) {
  const { brand: brandSlug, size: sizeParam } = await params;
  const { kalite } = await searchParams;
  const size = normalizeSize(sizeParam);
  const kaliteFilter = parseKaliteFilter(kalite);
  const qualityForQuery =
    kaliteFilter === "ALL" ? undefined : (kaliteFilter as Quality);
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const families = await getCatalogFamilies(brandSlug, size, qualityForQuery);
  if (!families) notFound();

  const layout = getSizeLayout(size);
  const gridClass =
    layout.columns === 2
      ? "catalog-grid-2 grid grid-cols-2 gap-8"
      : "catalog-list-single flex flex-col gap-10";

  const headerQualityLabel =
    kaliteFilter === "ALL"
      ? kaliteFilterLabel("ALL")
      : `${kaliteFilterLabel(kaliteFilter)} KALİTE`;

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <CatalogSizeHeader
          backHref={`/katalog/${brand.slug}?${kaliteQuery(kaliteFilter)}`}
          size={size}
          qualityLabel={headerQualityLabel}
          brandSlug={brand.slug}
          brandName={brand.name}
        />
        <ProductListWithSearch
          families={families}
          brandSlug={brand.slug}
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
