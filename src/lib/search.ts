import type { Quality, Surface } from "@/generated/prisma/client";
import { TILE_SIZES } from "@/lib/constants";
import { buildPriceSummary, type PriceSummary } from "@/lib/prices";
import { pickSizeListImage, toImageCandidates } from "@/lib/product-image";
import type { SyncFamilyRow, SyncVariantRow } from "@/lib/sync-types";

export type GlobalSearchItem = {
  id: string;
  familyId: string;
  name: string;
  slug: string;
  brandSlug: string;
  brandName?: string;
  imageUrl: string | null;
  size: string;
  prices: PriceSummary;
  codes: string[];
};

type SearchVariant = {
  size: string;
  surface: Surface;
  quality: Quality;
  price: number | null;
  code?: string | null;
  imageUrl?: string | null;
};

type SearchFamily = {
  id: string;
  name: string;
  slug: string;
  brandSlug: string;
  brandName?: string;
  imageUrl?: string | null;
};

export function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase();
}

export function familyMatchesQuery(
  familyName: string,
  codes: string[],
  query: string
) {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  if (familyName.toLowerCase().includes(q)) return true;
  return codes.some((code) => code.toLowerCase().includes(q));
}

export function sortSizes(sizes: string[]) {
  const order = new Map(TILE_SIZES.map((size, index) => [size, index]));
  return [...sizes].sort((a, b) => {
    const ai = order.get(a as (typeof TILE_SIZES)[number]) ?? 999;
    const bi = order.get(b as (typeof TILE_SIZES)[number]) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.localeCompare(b);
  });
}

export function compareSearchItems(a: GlobalSearchItem, b: GlobalSearchItem) {
  const nameCmp = a.name.localeCompare(b.name, "tr");
  if (nameCmp !== 0) return nameCmp;
  const sizes = sortSizes([a.size, b.size]);
  return sizes.indexOf(a.size) - sizes.indexOf(b.size);
}

export function buildFamilySearchItems(
  family: SearchFamily,
  variants: SearchVariant[]
): GlobalSearchItem[] {
  const sizes = sortSizes([...new Set(variants.map((v) => v.size))]);
  const allCodes = variants
    .map((v) => v.code)
    .filter((code): code is string => Boolean(code));

  return sizes.map((size) => {
    const sizeVariants = variants.filter((v) => v.size === size);

    return {
      id: `${family.id}:${size}`,
      familyId: family.id,
      name: family.name,
      slug: family.slug,
      brandSlug: family.brandSlug,
      brandName: family.brandName,
      imageUrl: pickSizeListImage(
        family.imageUrl ?? null,
        toImageCandidates(sizeVariants),
        size
      ),
      size,
      prices: buildPriceSummary(
        sizeVariants.map((v) => ({
          surface: v.surface,
          quality: v.quality,
          price: v.price,
        }))
      ),
      codes: allCodes,
    };
  });
}

export function buildGlobalSearchItems(
  families: Record<string, SyncFamilyRow>,
  variants: Record<string, SyncVariantRow>
): GlobalSearchItem[] {
  const byFamily = new Map<string, SyncVariantRow[]>();

  for (const variant of Object.values(variants)) {
    const list = byFamily.get(variant.familyId) ?? [];
    list.push(variant);
    byFamily.set(variant.familyId, list);
  }

  return Object.values(families)
    .filter((family) => family.isActive !== false)
    .flatMap((family) => {
    const familyVariants = byFamily.get(family.id) ?? [];

    return buildFamilySearchItems(
      {
        id: family.id,
        name: family.name,
        slug: family.slug,
        brandSlug: family.brandSlug,
        imageUrl: family.imageUrl,
      },
      familyVariants.map((v) => ({
        size: v.size,
        surface: v.surface as Surface,
        quality: v.quality as Quality,
        price: v.price,
        code: v.code,
        imageUrl: v.imageUrl,
      }))
    );
  });
}
