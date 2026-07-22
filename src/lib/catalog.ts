import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizeSize, getSizesForBrand } from "@/lib/constants";
import { buildPriceSummary, type PriceSummary } from "@/lib/prices";
import type { Quality } from "@/generated/prisma/client";
import { pickSizeListImage, toImageCandidates } from "@/lib/product-image";
import { buildFamilySearchItems, type GlobalSearchItem } from "@/lib/search";
import { CATALOG_TAG, CATALOG_REVALIDATE_SECONDS } from "@/lib/cache-tags";
import type { CatalogAudience } from "@/lib/catalog-audience";

export type { PriceSummary };
export { buildPriceSummary };

/**
 * Marka görünürlüğü artık veritabanında (Brand.isVisible / visibleToDealers).
 * Daha önce bu kural üç ayrı yerde koda gömülüydü ve birini güncellemeyi
 * unutmak kolaydı.
 */
export function brandVisibilityFilter(audience: CatalogAudience) {
  return {
    isVisible: true,
    ...(audience === "dealer" ? { visibleToDealers: true } : {}),
  };
}

const catalogCacheOptions = {
  tags: [CATALOG_TAG],
  revalidate: CATALOG_REVALIDATE_SECONDS,
};

// --- Marka lookup (istek içinde tekilleştirilir) ---

async function _getBrandBySlug(slug: string, audience: CatalogAudience = "default") {
  return prisma.brand.findFirst({
    where: {
      slug,
      ...brandVisibilityFilter(audience),
    },
  });
}

/** Aynı istek içinde tekrar eden marka sorgularını tekilleştirir. */
export const getBrandBySlug = cache(_getBrandBySlug);

export const getBrands = cache(async (audience: CatalogAudience = "default") => {
  return prisma.brand.findMany({
    where: brandVisibilityFilter(audience),
    orderBy: { sortOrder: "asc" },
  });
});

// --- Marka → ölçü / kalite listesi (marka sayfası) ---

async function _getBrandSizeCatalog(brandId: string, brandSlug: string) {
  const variantWhere = {
    isActive: true,
    family: { brandId, isActive: true },
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
  return {
    sizes: getSizesForBrand(brandSlug).filter((s) => sizeSet.has(s)),
    qualities: availableQualities.map((q) => q.quality as Quality),
  };
}

export const getBrandSizeCatalog = unstable_cache(
  _getBrandSizeCatalog,
  ["catalog-brand-sizes"],
  catalogCacheOptions
);

// --- Ölçü bazlı ürün aileleri (liste sayfaları) ---

async function _getCatalogFamilies(
  brandSlug: string,
  size: string,
  quality?: Quality,
  audience: CatalogAudience = "default"
) {
  const brand = await _getBrandBySlug(brandSlug, audience);
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

export const getCatalogFamilies = unstable_cache(
  _getCatalogFamilies,
  ["catalog-families"],
  catalogCacheOptions
);

async function _getCatalogFamiliesGroupedByBrand(
  size: string,
  quality?: Quality,
  audience: CatalogAudience = "default"
) {
  const brands = await prisma.brand.findMany({
    where: brandVisibilityFilter(audience),
    orderBy: { sortOrder: "asc" },
  });

  const groups = await Promise.all(
    brands.map(async (brand) => ({
      brand: { id: brand.id, slug: brand.slug, name: brand.name },
      families: (await _getCatalogFamilies(brand.slug, size, quality, audience)) ?? [],
    }))
  );

  return groups.filter((group) => group.families.length > 0);
}

export const getCatalogFamiliesGroupedByBrand = unstable_cache(
  _getCatalogFamiliesGroupedByBrand,
  ["catalog-grouped"],
  catalogCacheOptions
);

// --- Ürün ailesi detayı ---

async function _getFamilyDetail(
  brandSlug: string,
  size: string,
  familySlug: string,
  audience: CatalogAudience = "default"
) {
  const brand = await _getBrandBySlug(brandSlug, audience);
  if (!brand) return null;

  const family = await prisma.productFamily.findFirst({
    where: { brandId: brand.id, slug: familySlug, isActive: true },
    include: {
      variants: {
        where: { isActive: true },
        include: { stockLines: true },
        orderBy: [{ size: "asc" }, { surface: "asc" }, { quality: "asc" }],
      },
    },
  });

  if (!family) return null;

  const allVariants = family.variants.map((v) => ({
    id: v.id,
    size: v.size,
    surface: v.surface as string,
    quality: v.quality as string,
    feature3D: v.feature3D,
    featureRec: v.featureRec,
    price: v.price,
    code: v.code,
    imageUrl: v.imageUrl,
    palletM2: v.palletM2,
    boxM2: v.boxM2,
    truckM2: v.truckM2,
    stockLines: v.stockLines.map((l) => ({
      id: l.id,
      label: l.label,
      quantityM2: l.quantityM2,
    })),
    // Stok satırlarının en son güncellenme zamanı (import/manuel sabitleme).
    stockUpdatedAt:
      v.stockLines.length > 0
        ? new Date(
            Math.max(...v.stockLines.map((l) => l.updatedAt.getTime()))
          ).toISOString()
        : null,
  }));

  return {
    family: {
      id: family.id,
      name: family.name,
      slug: family.slug,
      imageUrl: family.imageUrl,
    },
    brand: { id: brand.id, slug: brand.slug, name: brand.name },
    sizes: [...new Set(allVariants.map((v) => v.size))],
    allVariants,
  };
}

export const getFamilyDetail = unstable_cache(
  _getFamilyDetail,
  ["catalog-family-detail"],
  catalogCacheOptions
);

// --- Küçük, sık kullanılan sorgular ---

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

export const getActiveAnnouncements = cache(async () => {
  return prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
});

// --- Global arama indeksi (anasayfa + arama) ---

async function _getGlobalSearchCatalog(
  audience: CatalogAudience = "default"
): Promise<GlobalSearchItem[]> {
  const families = await prisma.productFamily.findMany({
    where: {
      isActive: true,
      brand: brandVisibilityFilter(audience),
    },
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

  return families.flatMap((family) =>
    buildFamilySearchItems(
      {
        id: family.id,
        name: family.name,
        slug: family.slug,
        brandSlug: family.brand.slug,
        brandName: family.brand.name,
        imageUrl: family.imageUrl,
      },
      family.variants
    )
  );
}

export const getGlobalSearchCatalog = unstable_cache(
  _getGlobalSearchCatalog,
  ["catalog-search-index"],
  catalogCacheOptions
);
