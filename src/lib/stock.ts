import type { Quality } from "@/generated/prisma/client";

export type StockSummary = {
  first: number | null;
  end: number | null;
};

/**
 * Fiyat özeti (buildPriceSummary) ile aynı desen: kalite bazında toplam
 * stok m². Aynı ölçü/aile için birden çok varyant (yüzey/özellik farkı)
 * varsa toplanır — kart/arama sonucu düzeyinde "toplam ne kadar var"
 * gösterilir, varyant kırılımı ürün detayında zaten mevcut.
 */
export function buildStockSummary(
  variants: { quality: Quality | string; stockM2: number }[]
): StockSummary {
  let first: number | null = null;
  let end: number | null = null;
  for (const v of variants) {
    if (v.quality === "FIRST") {
      first = (first ?? 0) + v.stockM2;
    } else {
      end = (end ?? 0) + v.stockM2;
    }
  }
  return { first, end };
}

export const EMPTY_STOCK_SUMMARY: StockSummary = { first: null, end: null };
