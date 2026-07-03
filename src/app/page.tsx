import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BrandCatalogTile } from "@/components/BrandCatalogTile";
import { DeviceGate } from "@/components/DeviceGate";
import { HomeSearchSection } from "@/components/HomeSearchSection";
import { SyncStatusLine } from "@/components/SyncStatusLine";
import { SiteHeader } from "@/components/SiteHeader";
import { formatSizeLabel } from "@/lib/constants";
import {
  getActiveAnnouncements,
  getAppSettings,
  getBrands,
  getGlobalSearchCatalog,
} from "@/lib/catalog";

export default async function HomePage() {
  const [brands, settings, announcements, searchIndex] = await Promise.all([
    getBrands(),
    getAppSettings(),
    getActiveAnnouncements(),
    getGlobalSearchCatalog(),
  ]);

  const lastUpdate = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(settings.lastPriceListUpdate);

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <HomeSearchSection searchIndex={searchIndex}>
        <section className="mt-6 px-5">
          <SyncStatusLine serverPriceDate={lastUpdate} />
        </section>

        {announcements.length > 0 && (
          <section className="mt-6 px-5">
            {announcements.map((item) => (
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

        <section className="mt-8 px-5">
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

        <section className="mt-10 px-5">
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
        </HomeSearchSection>
      </AppShell>
    </DeviceGate>
  );
}
