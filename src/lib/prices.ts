import type { Quality, Surface } from "@/generated/prisma/client";

export type PriceSummary = {
  first: Partial<Record<Surface, number>>;
  end: Partial<Record<Surface, number>>;
};

export function buildPriceSummary(
  variants: { surface: Surface; quality: Quality; price: number | null }[]
): PriceSummary {
  const summary: PriceSummary = { first: {}, end: {} };
  for (const v of variants) {
    if (v.price == null || v.price <= 0) continue;
    const bucket = v.quality === "FIRST" ? summary.first : summary.end;
    if (bucket[v.surface] === undefined) {
      bucket[v.surface] = v.price;
    }
  }
  return summary;
}

export function variantCode(
  familyName: string,
  surface: Surface,
  quality: Quality
) {
  const q = quality === "FIRST" ? "1." : "END.";
  return `${familyName} ${surface} ${q}`;
}

/** END fiyatı: 1. kalite fiyatından %20 indirim, sonra yukarı en yakın 5'e */
export const END_PRICE_DISCOUNT = 0.2;

export function roundUpToNearest5(value: number) {
  return Math.ceil(value / 5) * 5;
}

export function endPriceFromFirst(firstPrice: number) {
  const discounted = firstPrice * (1 - END_PRICE_DISCOUNT);
  return roundUpToNearest5(discounted);
}
