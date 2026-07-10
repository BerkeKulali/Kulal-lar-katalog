import type { Quality, Surface } from "@/generated/prisma/client";
import {
  DEFAULT_PRODUCT_FEATURES,
  featureBadges,
  type ProductFeatureFlags,
} from "@/lib/product-features";

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
  quality: Quality,
  features: ProductFeatureFlags = DEFAULT_PRODUCT_FEATURES
) {
  const q = quality === "FIRST" ? "1." : "END.";
  const extras = featureBadges(features);
  if (extras.length === 0) {
    return `${familyName} ${surface} ${q}`;
  }
  return `${familyName} ${surface} ${extras.join(" ")} ${q}`;
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
