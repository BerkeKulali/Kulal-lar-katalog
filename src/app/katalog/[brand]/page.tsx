import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BrandCatalogPicker } from "@/components/BrandCatalogPicker";
import { CatalogBrandBar } from "@/components/CatalogSizeHeader";
import { DeviceGate } from "@/components/DeviceGate";
import { SiteHeader } from "@/components/SiteHeader";
import { getSizesForBrand } from "@/lib/constants";
import { getBrandBySlug } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import type { Quality } from "@/generated/prisma/client";

export const revalidate = 60;

export default async function BrandSizePage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: brandSlug } = await params;
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) notFound();

  const variantWhere = {
    isActive: true,
    family: {
      brandId: brand.id,
      isActive: true,
    },
  } as const;

  const [availableSizes, availableQualities] = await Promise.all([
    prisma.productVariant.findMany({
      where: variantWhere,
      select: { size: true },
      distinct: ["size"],
    }),
    prisma.productVariant.findMany({
      where: variantWhere,
      select: { quality: true },
      distinct: ["quality"],
    }),
  ]);

  const sizeSet = new Set(availableSizes.map((s) => s.size));
  const sizes = getSizesForBrand(brand.slug).filter((s) => sizeSet.has(s));
  const qualities = availableQualities.map((q) => q.quality as Quality);

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
