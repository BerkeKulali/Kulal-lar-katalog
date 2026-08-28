import Link from "next/link";
import { cookies } from "next/headers";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { AppShell } from "@/components/AppShell";
import { BrandCatalogTile } from "@/components/BrandCatalogTile";
import { DeviceGate } from "@/components/DeviceGate";
import { HomeSearchSection } from "@/components/HomeSearchSection";
import { SyncStatusLine } from "@/components/SyncStatusLine";
import { SiteHeader } from "@/components/SiteHeader";
import { formatSizeLabel } from "@/lib/constants";
import { HOME_COLORS, HOME_MATERIAL_TYPES } from "@/lib/product-attributes";
import { getAdminSession } from "@/lib/admin-auth";
import { DEVICE_TOKEN_COOKIE, SALESPERSON_ID_COOKIE } from "@/lib/device-cookie";
import { resolveStockVisibility } from "@/lib/stock-visibility";
import { EMPTY_STOCK_SUMMARY } from "@/lib/stock";
import {
  getActiveAnnouncements,
  getActiveCampaigns,
  getAppSettings,
  getBrands,
  getGlobalSearchCatalog,
} from "@/lib/catalog";

export default async function HomePage() {
  const audience = await getCatalogAudienceFromCookies();
  const cookieStore = await cookies();
  const salespersonId = cookieStore.get(SALESPERSON_ID_COOKIE)?.value;
  const deviceToken = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;
  const [brands, settings, announcements, rawSearchIndex, campaigns, admin] =
    await Promise.all([
      getBrands(audience),
      getAppSettings(),
      getActiveAnnouncements(),
      getGlobalSearchCatalog(audience),
      getActiveCampaigns(audience),
      getAdminSession(),
    ]);
  const showStock = await resolveStockVisibility({
    isAdmin: Boolean(admin),
    salespersonId,
    deviceToken,
  });
  const searchIndex = showStock
    ? rawSearchIndex
    : rawSearchIndex.map((item) => ({ ...item, stock: EMPTY_STOCK_SUMMARY }));
  // Duyurular, o izleyiciye kapalı markaların adını içeriyorsa gizlenir.
  // (Önceden metinde "qua" geçmesi koda gömülü olarak filtreleniyordu; artık
  // kural veritabanındaki marka görünürlüğünden türetiliyor.)
  const visibleBrandNames = new Set(
    brands.map((brand) => brand.name.toLowerCase())
  );
  const allBrands = await getBrands("default");
  const hiddenBrandNames = allBrands
    .map((brand) => brand.name.toLowerCase())
    .filter((name) => !visibleBrandNames.has(name));

  const visibleAnnouncements = announcements.filter((item) => {
    const text = `${item.title} ${item.body ?? ""}`.toLowerCase();
    return !hiddenBrandNames.some((name) => text.includes(name));
  });

  const lastUpdate = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(settings.lastPriceListUpdate));

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <HomeSearchSection searchIndex={searchIndex} initialShowStock={showStock}>
        <section className="mt-6">
          <SyncStatusLine serverPriceDate={lastUpdate} />
        </section>

        {visibleAnnouncements.length > 0 && (
          <section className="mt-6">
            {visibleAnnouncements.map((item) => (
              <div
                key={item.id}
                className="mb-3 border border-zinc-800 px-4 py-3 text-sm"
              >
                <p className="font-semibold">{item.title}</p>
                {item.body && (
                  <p className="mt-1 text-xs text-zinc-400">{item.body}</p>
                )}
              </div>
            ))}
          </section>
        )}

        {campaigns.length > 0 && (
          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-[0.3em] text-zinc-500">
                KAMPANYALAR
              </h2>
              <Link
                href="/kampanyalar"
                className="text-[10px] text-zinc-500 underline"
              >
                Tümünü gör
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  href="/kampanyalar"
                  className="block w-40 flex-shrink-0 p-2"
                >
                  {(c.locationTag || c.sizeTag || c.qualityTag) && (
                    <div className="campaign-tag-medallion campaign-tag-medallion--sm mb-2">
                      {c.locationTag && (
                        <span className="campaign-tag-line">{c.locationTag}</span>
                      )}
                      {c.sizeTag && (
                        <span className="campaign-tag-line campaign-tag-line--muted">
                          {c.sizeTag}
                        </span>
                      )}
                      {c.qualityTag && (
                        <span className="campaign-tag-line campaign-tag-line--muted">
                          {c.qualityTag}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="truncate text-[11px] font-semibold">{c.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-4 text-center text-xs font-semibold tracking-[0.3em] text-zinc-500">
            MARKALAR
          </h2>
          <div className="catalog-brands">
            {brands.map((brand) => (
              <BrandCatalogTile
                key={brand.id}
                slug={brand.slug}
                name={brand.name}
                logoText={brand.logoText}
              />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-center text-xs font-semibold tracking-[0.3em] text-zinc-500">
            HIZLI ÖLÇÜ
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["60x120", "80x160", "60x60", "80x80", "20x120", "30x90"].map((size) => (
              <Link
                key={size}
                href={`/katalog/olcu/${size}?kalite=tumu`}
                className="catalog-size-chip"
              >
                {formatSizeLabel(size)}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-zinc-600">
            Hızlı ölçü tüm markalarda arama yapar
          </p>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-center text-xs font-semibold tracking-[0.3em] text-zinc-500">
            TİPE GÖRE
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {HOME_MATERIAL_TYPES.map((m) => (
              <Link
                key={m.id}
                href={`/arama?tip=${m.id}`}
                className="catalog-size-chip catalog-filter-chip"
              >
                {m.label}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-zinc-600">
            Mermer, ahşap, beton… tüm markalarda filtreler
          </p>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-center text-xs font-semibold tracking-[0.3em] text-zinc-500">
            RENGE GÖRE
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {HOME_COLORS.map((c) => (
              <Link
                key={c.id}
                href={`/arama?renk=${c.id}`}
                className="catalog-size-chip catalog-filter-chip inline-flex items-center gap-1.5"
              >
                <span
                  className="inline-block h-3 w-3 rounded-full border border-black/20"
                  style={{ background: c.hex }}
                />
                {c.label}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-zinc-600">
            Renge göre tüm markalarda filtreler
          </p>
        </section>
        </HomeSearchSection>
      </AppShell>
    </DeviceGate>
  );
}
