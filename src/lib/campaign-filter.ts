/**
 * Kampanya ürün segmenti filtresi: marka/malzeme tipi/kalite/stok aralığına
 * göre ürün (varyant) listesi çıkarır. Saf mantık — DB'den bağımsız, test
 * edilebilir (bkz. campaign-filter.test.ts). API route bu fonksiyonu,
 * `src/app/api/admin/stock/list/route.ts`'teki gibi Prisma'dan topladığı
 * stok verisiyle besler.
 *
 * Stok aralığı tanımı (ikisi de opsiyonel, birlikte kullanılabilir — örn.
 * "40 üstü, 180 altı" için minM2=40, maxM2=180):
 * - minM2 (alt sınır) → stok >= minM2 (dahil, eski "üstü" davranışı)
 * - maxM2 (üst sınır) → stok < maxM2  (dahil DEĞİL, eski "altı" davranışı)
 * İkisi de null ise stok hiç filtrelenmez.
 */

export type FilterBasis = "family" | "variant";
export type FilterQuality = "FIRST" | "END";

export type FilterCriteria = {
  /** Boş dizi = tüm markalar. */
  brandIds: string[];
  materialType: string | null;
  /** null = tüm kaliteler. */
  quality: FilterQuality | null;
  basis: FilterBasis;
  /** null = alt sınır yok. */
  minM2: number | null;
  /** null = üst sınır yok. */
  maxM2: number | null;
};

export type VariantForFilter = {
  variantId: string;
  familyId: string;
  familyName: string;
  brandId: string;
  brandName: string;
  materialType: string | null;
  size: string;
  surface: string;
  quality: FilterQuality;
  stockM2: number;
};

export type FilterRow = {
  variantId: string;
  familyId: string;
  familyName: string;
  brandName: string;
  size: string;
  surface: string;
  quality: FilterQuality;
  /** Bu tek varyantın stoğu. */
  stockM2: number;
  /**
   * Ailenin (marka/malzeme/kalite filtresinden geçen tüm varyantları
   * toplamında) toplam stoğu — basis'ten bağımsız olarak her zaman
   * hesaplanır ve gösterilir. Eşik karşılaştırması basis "family" iken bu
   * değerle, basis "variant" iken `stockM2` ile yapılır.
   */
  familyTotalStockM2: number;
};

function matchesBaseCriteria(
  v: VariantForFilter,
  criteria: FilterCriteria
): boolean {
  if (criteria.brandIds.length > 0 && !criteria.brandIds.includes(v.brandId)) {
    return false;
  }
  if (criteria.materialType && v.materialType !== criteria.materialType) {
    return false;
  }
  if (criteria.quality && v.quality !== criteria.quality) {
    return false;
  }
  return true;
}

function passesRange(stock: number, criteria: FilterCriteria): boolean {
  if (criteria.minM2 != null && stock < criteria.minM2) return false;
  if (criteria.maxM2 != null && stock >= criteria.maxM2) return false;
  return true;
}

function sortRows(rows: FilterRow[]): FilterRow[] {
  return [...rows].sort((a, b) => {
    return (
      a.brandName.localeCompare(b.brandName, "tr") ||
      a.familyName.localeCompare(b.familyName, "tr") ||
      a.size.localeCompare(b.size) ||
      a.surface.localeCompare(b.surface)
    );
  });
}

/**
 * Kriterlere uyan varyant satırlarını döndürür.
 *
 * - `basis: "variant"` → her varyant kendi stoğuyla eşiğe karşı denenir.
 * - `basis: "family"` → marka/malzeme/kalite filtresinden geçen varyantlar
 *   ailelerine göre toplanır; toplam eşiği geçen ailelerin (yine filtreden
 *   geçmiş) tüm varyant satırları döner.
 *
 * Her iki modda da dönen satırlarda `familyTotalStockM2` bulunur (basis
 * "variant" iken de bilgi amaçlı gösterilir, eşik karşılaştırmasında
 * kullanılmaz).
 */
export function applyProductFilter(
  variants: VariantForFilter[],
  criteria: FilterCriteria
): FilterRow[] {
  const candidates = variants.filter((v) => matchesBaseCriteria(v, criteria));

  const totalsByFamily = new Map<string, number>();
  for (const v of candidates) {
    totalsByFamily.set(
      v.familyId,
      (totalsByFamily.get(v.familyId) ?? 0) + v.stockM2
    );
  }

  const passing =
    criteria.basis === "variant"
      ? candidates.filter((v) => passesRange(v.stockM2, criteria))
      : candidates.filter((v) => {
          const total = totalsByFamily.get(v.familyId) ?? 0;
          return passesRange(total, criteria);
        });

  const rows = passing.map(
    (v): FilterRow => ({
      variantId: v.variantId,
      familyId: v.familyId,
      familyName: v.familyName,
      brandName: v.brandName,
      size: v.size,
      surface: v.surface,
      quality: v.quality,
      stockM2: v.stockM2,
      familyTotalStockM2: totalsByFamily.get(v.familyId) ?? v.stockM2,
    })
  );

  return sortRows(rows);
}
