import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { AllSizesProductList } from "@/components/AllSizesProductList";
import { AppShell } from "@/components/AppShell";
import { DeviceGate } from "@/components/DeviceGate";
import { SiteHeader } from "@/components/SiteHeader";
import { getSizeLayout } from "@/lib/constants";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getBrandBySlug,
  getBrandSizeCatalog,
  getCatalogFamilies,
} from "@/lib/catalog";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";
import { resolveStockVisibility } from "@/lib/stock-visibility";
import { EMPTY_STOCK_SUMMARY } from "@/lib/stock";
import { kaliteFilterLabel, kaliteQuery, parseKaliteFilter } from "@/lib/utils";
import type { Quality } from "@/generated/prisma/client";

/**
 * "Ölçü seçin" ekranındaki "Tümü" seçeneğinin hedefi: markanın TÜM
 * ölçülerindeki ürünleri, ölçüye göre gruplanmış bölümler halinde tek
 * sayfada gösterir. Her ölçü, [brand]/[size]/page.tsx ile birebir aynı
 * `getCatalogFamilies` çağrısıyla (aynı önbellek, aynı stok/fiyat mantığı)
 * ayrı ayrı çekilir - burada yeni bir veri yolu icat edilmiyor, sadece
 * var olan tekli-ölçü sorgusu her ölçü için paralel çalıştırılıyor.
 *
 * Ölçüye göre daraltma (Ebat filtresi) TAMAMEN istemci tarafında olur
 * (bkz. AllSizesProductList) - sayfa yenilenmez, "Sadece Stoklu" ile aynı
 * davranış; veri zaten burada tüm ölçüler için toplanıp aşağı gönderiliyor.
 */
export default async function AllSizesProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string }>;
  searchParams: Promise<{ kalite?: string }>;
}) {
  const { brand: brandSlug } = await params;
  const { kalite } = await searchParams;
  const kaliteFilter = parseKaliteFilter(kalite);
  const qualityForQuery =
    kaliteFilter === "ALL" ? undefined : (kaliteFilter as Quality);
  const audience = await getCatalogAudienceFromCookies();
  const brand = await getBrandBySlug(brandSlug, audience);
  if (!brand) notFound();

  const cookieStore = await cookies();
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

  const [{ sizes }, admin] = await Promise.all([
    getBrandSizeCatalog(brand.id, brand.slug),
    getAdminSession(),
  ]);

  // Stok görünürlüğü tek noktadan: admin / plasiyer / bayi (bkz. [size]/page.tsx).
  const showStock = await resolveStockVisibility({
    isAdmin: Boolean(admin),
    deviceToken,
  });

  const familiesBySize = await Promise.all(
    sizes.map((size) =>
      getCatalogFamilies(brandSlug, size, qualityForQuery, audience)
    )
  );

  const sections = sizes
    .map((size, i) => {
      const families = familiesBySize[i];
      if (!families || families.length === 0) return null;
      const layout = getSizeLayout(size);
      const gridClass =
        layout.columns === 2
          ? "catalog-grid-2 grid grid-cols-2 gap-8"
          : "catalog-list-single flex flex-col gap-10";
      return {
        size,
        aspect: layout.aspect,
        gridClass,
        families: families.map((f) => ({
          ...f,
          stock: showStock ? f.stock : EMPTY_STOCK_SUMMARY,
        })),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const headerQualityLabel =
    kaliteFilter === "ALL"
      ? kaliteFilterLabel("ALL")
      : `${kaliteFilterLabel(kaliteFilter)} KALİTE`;

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <AllSizesProductList
          sections={sections}
          brandSlug={brand.slug}
          brandName={brand.name}
          backHref={`/katalog/${brand.slug}?${kaliteQuery(kaliteFilter)}`}
          qualityLabel={headerQualityLabel}
          quality={qualityForQuery}
          kaliteQuery={kaliteQuery(kaliteFilter)}
          showStock={showStock}
        />
      </AppShell>
    </DeviceGate>
  );
}
