import { prisma } from "@/lib/prisma";
import { normalizeSize } from "@/lib/constants";
import { buildPriceSummary, type PriceSummary } from "@/lib/prices";
import type { Quality } from "@/generated/prisma/client";
import { pickPreferredSize, type GlobalSearchItem } from "@/lib/search";
import { pickSizeListImage, toImageCandidates } from "@/lib/product-image";

export type { PriceSummary };
export { buildPriceSummary };

const HIDDEN_BRAND_SLUGS = ["kale"] as const;

export async function getBrands() {
  return prisma.brand.findMany({
    where: {
      slug: { notIn: [...HIDDEN_BRAND_SLUGS] },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getBrandBySlug(slug: string) {
  return prisma.brand.findFirst({
    where: {
      slug,
      NOT: { slug: { in: [...HIDDEN_BRAND_SLUGS] } },
    },
  });
}

export async function getCatalogFamilies(
  brandSlug: string,
  size: string,
  quality?: Quality
) {
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return null;

  const normalized = normalizeSize(size);
  const families = await prisma.productFamily.findMany({
    where: {
      brandId: brand.id,
      isActive: true,
      variants: {
        some: {
          size: normalized,
          isActive: true,
          ...(quality ? { quality } : {}),
        },
      },
    },
    include: {
      variants: {
        where: {
          size: normalized,
          isActive: true,
        },
        select: {
          surface: true,
          quality: true,
          price: true,
          imageUrl: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return families.map((family) => ({
    id: family.id,
    name: family.name,
    slug: family.slug,
    imageUrl: pickSizeListImage(
      family.imageUrl,
      toImageCandidates(family.variants),
      normalized
    ),
    prices: buildPriceSummary(family.variants),
  }));
}

export async function getCatalogFamiliesGroupedByBrand(
  size: string,
  quality?: Quality
) {
  const brands = await getBrands();
  const groups = await Promise.all(
    brands.map(async (brand) => {
      const families = await getCatalogFamilies(brand.slug, size, quality);
      return {
        brand,
        families: families ?? [],
      };
    })
  );

  return groups.filter((group) => group.families.length > 0);
}

export async function getFamilyDetail(
  brandSlug: string,
  size: string,
  familySlug: string
) {
  const brand = await getBrandBySlug(brandSlug);
  if (!brand) return null;

  const normalized = normalizeSize(size);
  const family = await prisma.productFamily.findFirst({
    where: { brandId: brand.id, slug: familySlug, isActive: true },
    include: {
      brand: true,
      variants: {
        where: { isActive: true },
        include: { stockLines: true },
        orderBy: [{ size: "asc" }, { surface: "asc" }, { quality: "asc" }],
      },
    },
  });

  if (!family) return null;

  const sizes = [...new Set(family.variants.map((v) => v.size))];
  const variantsForSize = family.variants.filter((v) => v.size === normalized);

  return {
    family,
    brand,
    sizes,
    variantsForSize,
    allVariants: family.variants,
  };
}

export async function searchProducts(query: string) {
  const q = query.trim();
  if (!q) return [];

  return prisma.productFamily.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q } },
        { variants: { some: { code: { contains: q } } } },
      ],
    },
    include: {
      brand: true,
      variants: {
        where: { isActive: true },
        take: 1,
        orderBy: { updatedAt: "desc" },
      },
    },
    take: 40,
    orderBy: { name: "asc" },
  });
}

export async function getAppSettings() {
  return prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
}

export async function getActiveAnnouncements() {
  return prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getGlobalSearchCatalog(): Promise<GlobalSearchItem[]> {
  const families = await prisma.productFamily.findMany({
    where: { isActive: true },
    include: {
      brand: true,
      variants: {
        where: { isActive: true },
        select: {
          size: true,
          surface: true,
          quality: true,
          price: true,
          code: true,
          imageUrl: true,
        },
      },
    },
    orderBy: [{ brand: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return families.map((family) => {
    const sizes = [...new Set(family.variants.map((v) => v.size))];
    const size = pickPreferredSize(sizes);
    const sizeVariants = family.variants.filter((v) => v.size === size);

    return {
      id: family.id,
      name: family.name,
      slug: family.slug,
      brandSlug: family.brand.slug,
      brandName: family.brand.name,
      imageUrl: pickSizeListImage(
        family.imageUrl,
        toImageCandidates(sizeVariants),
        size
      ),
      size,
      prices: buildPriceSummary(sizeVariants),
      codes: family.variants
        .map((v) => v.code)
        .filter((code): code is string => Boolean(code)),
    };
  });
}
