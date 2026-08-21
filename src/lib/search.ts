import type { Quality, Surface } from "@/generated/prisma/client";
import { getAllCatalogSizes } from "@/lib/constants";
import { turkishFold } from "@/lib/text-match";
import { buildPriceSummary, type PriceSummary } from "@/lib/prices";
import { buildStockSummary, EMPTY_STOCK_SUMMARY, type StockSummary } from "@/lib/stock";
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
  stock: StockSummary;
  codes: string[];
  color: string | null;
  materialType: string | null;
};

type SearchVariant = {
  size: string;
  surface: Surface;
  quality: Quality;
  price: number | null;
  code?: string | null;
  imageUrl?: string | null;
  /** Zaten stok görme yetkisi olmayan cihazlar için 0 gelir/gelmelidir. */
  stockM2?: number;
  stockUpdatedAt?: string | null;
};

type SearchFamily = {
  id: string;
  name: string;
  slug: string;
  brandSlug: string;
  brandName?: string;
  imageUrl?: string | null;
  color?: string | null;
  materialType?: string | null;
};

export function normalizeSearchQuery(query: string) {
  return turkishFold(query.trim());
}

export function familyMatchesQuery(
  familyName: string,
  codes: string[],
  query: string
) {
  const q = normalizeSearchQuery(query);
  if (!q) return true;
  if (turkishFold(familyName).includes(q)) return true;
  // "code" alanı bazı markalarda (ör. GÜRAL fiyat listesi importu) gerçek
  // bir SKU değil, tedarikçinin ham ürün adı metni ("ANTIQUE 60X60 SİDAN
  // PARLAK" gibi) — cümle içindeki herhangi bir yerde substring araması
  // yapmak, aramayla hiç ilgisi olmayan kelimelerin (ör. "sid" → "sidan")
  // yanlışlıkla eşleşmesine yol açıyordu. Kodun BAŞINDAN eşleşmeyi aramak
  // (startsWith), gerçek kısa kodların yine bulunmasını sağlarken bu
  // rastgele iç-metin eşleşmelerini engelliyor.
  return codes.some((code) => turkishFold(code).startsWith(q));
}

export type SearchAttributeFilters = {
  color?: string | null;
  materialType?: string | null;
  size?: string | null;
  brandSlug?: string | null;
};

/** Renk/tip/ebat/marka filtresi. Boş filtre alanları her şeyi geçirir. */
export function itemMatchesAttributes(
  item: Pick<GlobalSearchItem, "color" | "materialType" | "size" | "brandSlug">,
  filters: SearchAttributeFilters
) {
  if (filters.color && item.color !== filters.color) return false;
  if (filters.materialType && item.materialType !== filters.materialType) return false;
  if (filters.size && item.size !== filters.size) return false;
  if (filters.brandSlug && item.brandSlug !== filters.brandSlug) return false;
  return true;
}

export function sortSizes(sizes: string[]) {
  const order = new Map(getAllCatalogSizes().map((size, index) => [size, index]));
  return [...sizes].sort((a, b) => {
    const ai = order.get(a) ?? 999;
    const bi = order.get(b) ?? 999;
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
        toImageCandidates(
          sizeVariants.map((v) => ({
            quality: v.quality,
            imageUrl: v.imageUrl ?? null,
          }))
        ),
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
      stock: sizeVariants.some((v) => v.stockM2 !== undefined)
        ? buildStockSummary(
            sizeVariants.map((v) => ({
              quality: v.quality,
              stockM2: v.stockM2 ?? 0,
              stockUpdatedAt: v.stockUpdatedAt ?? null,
            }))
          )
        : EMPTY_STOCK_SUMMARY,
      codes: allCodes,
      color: family.color ?? null,
      materialType: family.materialType ?? null,
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
        color: family.color ?? null,
        materialType: family.materialType ?? null,
      },
      familyVariants.map((v) => ({
        size: v.size,
        surface: v.surface as Surface,
        quality: v.quality as Quality,
        price: v.price,
        code: v.code,
        imageUrl: v.imageUrl,
        stockM2: v.stockM2,
        stockUpdatedAt: v.stockUpdatedAt,
      }))
    );
  });
}
