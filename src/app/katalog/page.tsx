import { BrandCatalogTile } from "@/components/BrandCatalogTile";
import { AppShell } from "@/components/AppShell";
import { DeviceGate } from "@/components/DeviceGate";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrands } from "@/lib/catalog";

export default async function CatalogIndexPage() {
  const brands = await getBrands();

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <section className="mt-8 px-5">
          <h1 className="mb-6 text-center text-sm font-semibold tracking-[0.3em]">
            KATALOG — MARKA SEÇİN
          </h1>
          <div className="catalog-brands grid grid-cols-2 gap-4 sm:grid-cols-4">
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
      </AppShell>
    </DeviceGate>
  );
}
