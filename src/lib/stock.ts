import type { Quality } from "@/generated/prisma/client";

export type StockSummary = {
  first: number | null;
  end: number | null;
  /**
   * Katkıda bulunan stok satırlarının en son yazılma zamanı (ISO), yoksa null.
   * Liste/kart görünümlerinde istemci senkron mağazasındaki değerin, sunucudan
   * taze gelen bu değerden daha bayat olup olmadığını karşılaştırmak için
   * kullanılır (bkz. SyncedProductList, ProductDetailView'daki aynı desen).
   */
  updatedAt: string | null;
};

/**
 * Fiyat özeti (buildPriceSummary) ile aynı desen: kalite bazında toplam
 * stok m². Aynı ölçü/aile için birden çok varyant (yüzey/özellik farkı)
 * varsa toplanır — kart/arama sonucu düzeyinde "toplam ne kadar var"
 * gösterilir, varyant kırılımı ürün detayında zaten mevcut.
 */
export function buildStockSummary(
  variants: {
    quality: Quality | string;
    stockM2: number;
    stockUpdatedAt?: string | null;
  }[]
): StockSummary {
  let first: number | null = null;
  let end: number | null = null;
  let updatedAt: string | null = null;
  for (const v of variants) {
    if (v.quality === "FIRST") {
      first = (first ?? 0) + v.stockM2;
    } else {
      end = (end ?? 0) + v.stockM2;
    }
    if (v.stockUpdatedAt && (!updatedAt || v.stockUpdatedAt > updatedAt)) {
      updatedAt = v.stockUpdatedAt;
    }
  }
  return { first, end, updatedAt };
}

export const EMPTY_STOCK_SUMMARY: StockSummary = {
  first: null,
  end: null,
  updatedAt: null,
};
