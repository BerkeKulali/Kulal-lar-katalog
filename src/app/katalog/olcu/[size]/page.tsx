import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BrandHeaderMark } from "@/components/BrandHeaderMark";
import { CatalogSizeHeader } from "@/components/CatalogSizeHeader";
import { DeviceGate } from "@/components/DeviceGate";
import { SiteHeader } from "@/components/SiteHeader";
import { SyncedProductList } from "@/components/SyncedProductList";
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

  const groups = await getCatalogFamiliesGroupedByBrand(size, qualityForQuery);
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
          qualityLabel={`${kaliteFilterLabel(kaliteFilter)} KALİTE`}
        />

        <section className="mb-6 flex justify-center gap-3 px-5">
          {(["ALL", "FIRST", "END"] as const).map((filter) => (
            <Link
              key={filter}
              href={`/katalog/olcu/${size}?${kaliteQuery(filter)}`}
              className={`catalog-picker-chip${kaliteFilter === filter ? " catalog-picker-chip--active" : ""}`}
            >
              {kaliteFilterLabel(filter)}
            </Link>
          ))}
        </section>

        {groups.length === 0 ? (
          <p className="px-5 text-center text-sm text-zinc-500">
            Bu ölçüde henüz ürün bulunamadı.
          </p>
        ) : (
          <div className="space-y-12 px-5">
            {groups.map((group) => (
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
                    aspect={layout.aspect}
                    quality={qualityForQuery}
                    kaliteQuery={kaliteQuery(kaliteFilter)}
                  />
                </div>
              </section>
            ))}
          </div>
        )}
      </AppShell>
    </DeviceGate>
  );
}
