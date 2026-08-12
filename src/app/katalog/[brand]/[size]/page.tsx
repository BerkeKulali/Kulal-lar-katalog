import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { AppShell } from "@/components/AppShell";
import { CatalogSizeHeader } from "@/components/CatalogSizeHeader";
import { DeviceGate } from "@/components/DeviceGate";
import { DisplayPrefsToggle } from "@/components/DisplayPrefsToggle";
import { ProductListWithSearch } from "@/components/ProductListWithSearch";
import { SiteHeader } from "@/components/SiteHeader";
import { getSizeLayout, normalizeSize } from "@/lib/constants";
import { getAdminSession } from "@/lib/admin-auth";
import { getBrandBySlug, getCatalogFamilies } from "@/lib/catalog";
import { DEVICE_TOKEN_COOKIE, SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
import { resolveStockVisibility } from "@/lib/stock-visibility";
import { EMPTY_STOCK_SUMMARY } from "@/lib/stock";
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
  const audience = await getCatalogAudienceFromCookies();
  const brand = await getBrandBySlug(brandSlug, audience);
  if (!brand) notFound();

  const cookieStore = await cookies();
  const salespersonId = cookieStore.get(SALESPERSON_ID_COOKIE)?.value;
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  const [families, admin] = await Promise.all([
    getCatalogFamilies(brandSlug, size, qualityForQuery, audience),
    getAdminSession(),
  ]);
  if (!families) notFound();

  // Stok görünürlüğü tek noktadan: admin / plasiyer / bayi (bkz. detay sayfası).
  const showStock = await resolveStockVisibility({
    isAdmin: Boolean(admin),
    salespersonId,
    deviceToken,
  });
  const visibleFamilies = families.map((f) => ({
    ...f,
    stock: showStock ? f.stock : EMPTY_STOCK_SUMMARY,
  }));

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
          right={<DisplayPrefsToggle initialShowStock={showStock} />}
        />
        <ProductListWithSearch
          families={visibleFamilies}
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
