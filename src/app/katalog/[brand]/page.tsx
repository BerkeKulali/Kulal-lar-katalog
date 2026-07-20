import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCatalogAudienceFromCookies } from "@/lib/catalog-audience";
import { AppShell } from "@/components/AppShell";
import { BrandCatalogPicker } from "@/components/BrandCatalogPicker";
import { CatalogBrandBar } from "@/components/CatalogSizeHeader";
import { DeviceGate } from "@/components/DeviceGate";
import { SiteHeader } from "@/components/SiteHeader";
import { getBrandBySlug, getBrandSizeCatalog } from "@/lib/catalog";

export const revalidate = 60;

export default async function BrandSizePage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: brandSlug } = await params;
  const audience = await getCatalogAudienceFromCookies();
  const brand = await getBrandBySlug(brandSlug, audience);
  if (!brand) {
    // Marka var ama bu izleyiciye kapalıysa 404 yerine kataloğa yönlendir
    // (bayiye kapalı markalar bu yolla gizlenir).
    const existsForAnyone = await getBrandBySlug(brandSlug, "default");
    if (existsForAnyone) redirect("/katalog");
    notFound();
  }

  const { sizes, qualities } = await getBrandSizeCatalog(brand.id, brand.slug);

  return (
    <DeviceGate>
      <AppShell className="pb-24">
        <SiteHeader />
        <CatalogBrandBar brandSlug={brand.slug} brandName={brand.name} />
        <section className="mt-6">
          <Suspense fallback={<div className="h-40" />}>
            <BrandCatalogPicker
              brandSlug={brand.slug}
              sizes={sizes}
              availableQualities={qualities}
            />
          </Suspense>
        </section>
      </AppShell>
    </DeviceGate>
  );
}
