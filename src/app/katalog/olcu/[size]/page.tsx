import Link from "next/link";
import { cookies } from "next/headers";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { AppShell } from "@/components/AppShell";
import { CatalogSizeHeader } from "@/components/CatalogSizeHeader";
import { DeviceGate } from "@/components/DeviceGate";
import { DisplayPrefsToggle } from "@/components/DisplayPrefsToggle";
import { OlcuCatalogWithSearch } from "@/components/OlcuCatalogWithSearch";
import { SiteHeader } from "@/components/SiteHeader";
import { getSizeLayout, normalizeSize } from "@/lib/constants";
import { getAdminSession } from "@/lib/admin-auth";
import { getCatalogFamiliesGroupedByBrand } from "@/lib/catalog";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";
import { resolveStockVisibility } from "@/lib/stock-visibility";
import { EMPTY_STOCK_SUMMARY } from "@/lib/stock";
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
  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  const [groups, admin] = await Promise.all([
    getCatalogFamiliesGroupedByBrand(size, qualityForQuery, audience),
    getAdminSession(),
  ]);

  // Stok görünürlüğü tek noktadan: admin / plasiyer / bayi (bkz. marka+ölçü
  // ve ürün detayı sayfalarındaki aynı desen). getCatalogFamiliesGroupedByBrand
  // her zaman ham (yetkiden bağımsız) stok döndürür — burada filtrelenmezse
  // stok görme yetkisi olmayan bir cihaz da gerçek stok sayılarını görürdü.
  const showStock = await resolveStockVisibility({
    isAdmin: Boolean(admin),
    deviceToken,
  });
  const visibleGroups = groups.map((group) => ({
    ...group,
    families: group.families.map((f) => ({
      ...f,
      stock: showStock ? f.stock : EMPTY_STOCK_SUMMARY,
    })),
  }));

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
          right={<DisplayPrefsToggle initialShowStock={showStock} />}
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
          groups={visibleGroups}
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
