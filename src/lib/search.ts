import type { Quality, Surface } from "@/generated/prisma/client";
import { buildPriceSummary, type PriceSummary } from "@/lib/prices";
import { pickSizeListImage, toImageCandidates } from "@/lib/product-image";
import type { SyncFamilyRow, SyncVariantRow } from "@/lib/sync-types";

export type GlobalSearchItem = {
  id: string;
  name: string;
  slug: string;
  brandSlug: string;
  brandName?: string;
  imageUrl: string | null;
  size: string;
  prices: PriceSummary;
  codes: string[];
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

export function pickPreferredSize(sizes: string[]) {
  if (sizes.includes("60x120")) return "60x120";
  return [...sizes].sort()[0] ?? "60x120";
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

  return Object.values(families).map((family) => {
    const familyVariants = byFamily.get(family.id) ?? [];
    const sizes = [...new Set(familyVariants.map((v) => v.size))];
    const size = pickPreferredSize(sizes);
    const sizeVariants = familyVariants.filter((v) => v.size === size);

    return {
      id: family.id,
      name: family.name,
      slug: family.slug,
      brandSlug: family.brandSlug,
      imageUrl: pickSizeListImage(
        family.imageUrl,
        toImageCandidates(sizeVariants),
        size
      ),
      size,
      prices: buildPriceSummary(
        sizeVariants.map((v) => ({
          surface: v.surface as Surface,
          quality: v.quality as Quality,
          price: v.price,
        }))
      ),
      codes: familyVariants
        .map((v) => v.code)
        .filter((code): code is string => Boolean(code)),
    };
  });
}
