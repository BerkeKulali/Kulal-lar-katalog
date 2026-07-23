import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { AppShell } from "@/components/AppShell";
import { CatalogBrandBar } from "@/components/CatalogSizeHeader";
import { DeviceGate } from "@/components/DeviceGate";
import { FamilyClickTracker } from "@/components/FamilyClickTracker";
import { ProductDetailView } from "@/components/ProductDetailView";
import { SiteHeader } from "@/components/SiteHeader";
import { formatSizeLabel, normalizeSize } from "@/lib/constants";
import { getAdminSession } from "@/lib/admin-auth";
import { getAppSettings, getFamilyDetail } from "@/lib/catalog";
import { DEVICE_TOKEN_COOKIE, SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
import { resolveStockVisibility } from "@/lib/stock-visibility";
import { kaliteQuery, parseKaliteFilter } from "@/lib/utils";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; size: string; family: string }>;
  searchParams: Promise<{ kalite?: string }>;
}) {
  const { brand: brandSlug, size: sizeParam, family: familySlug } =
    await params;
  const { kalite } = await searchParams;
  const size = normalizeSize(sizeParam);
  const kaliteFilter = parseKaliteFilter(kalite);
  const initialQuality =
    kaliteFilter === "ALL" ? undefined : kaliteFilter;
  const audience = await getCatalogAudienceFromCookies();
  const detail = await getFamilyDetail(brandSlug, size, familySlug, audience);
  if (!detail) notFound();

  // Stok görünürlüğü tek noktadan çözülür: admin / plasiyer / bayi.
  const cookieStore = await cookies();
  const salespersonId = cookieStore.get(SALESPERSON_ID_COOKIE)?.value;
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  const admin = await getAdminSession();
  const [showStock, settings] = await Promise.all([
    resolveStockVisibility({ isAdmin: Boolean(admin), salespersonId, deviceToken }),
    getAppSettings(),
  ]);

  const { family, brand, sizes, allVariants } = detail;

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <FamilyClickTracker familyId={family.id} />
        <SiteHeader />
        <CatalogBrandBar brandSlug={brand.slug} brandName={brand.name} />
        <div className="pb-2">
          <Link
            href={`/katalog/${brand.slug}/${size}?${kaliteQuery(kaliteFilter)}`}
            className="text-xs text-zinc-500 hover:text-white"
          >
            ← {formatSizeLabel(size)} listesi
          </Link>
        </div>
        <ProductDetailView
          familyName={family.name}
          brandName={brand.name}
          familyImageUrl={family.imageUrl}
          sizes={sizes}
          showStock={showStock}
          salesEnabled={settings.salesEnabled ?? true}
          variants={allVariants.map((v) => ({
            id: v.id,
            size: v.size,
            surface: v.surface,
            quality: v.quality,
            feature3D: v.feature3D,
            featureRec: v.featureRec,
            price: v.price,
            code: v.code,
            imageUrl: v.imageUrl,
            palletM2: v.palletM2,
            boxM2: v.boxM2,
            truckM2: v.truckM2,
            stockLines: showStock ? v.stockLines : [],
            stockUpdatedAt: showStock ? v.stockUpdatedAt : null,
          }))}
          initialSize={size}
          initialQuality={initialQuality}
        />
      </AppShell>
    </DeviceGate>
  );
}
