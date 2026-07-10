export type ProductFeatureFlags = {
  feature3D: boolean;
  featureRec: boolean;
};

export const DEFAULT_PRODUCT_FEATURES: ProductFeatureFlags = {
  feature3D: false,
  featureRec: false,
};

export function normalizeProductFeatures(
  input?: Partial<ProductFeatureFlags> | null
): ProductFeatureFlags {
  return {
    feature3D: Boolean(input?.feature3D),
    featureRec: Boolean(input?.featureRec),
  };
}

export function featureBadges(flags: ProductFeatureFlags): string[] {
  const badges: string[] = [];
  if (flags.feature3D) badges.push("3D");
  if (flags.featureRec) badges.push("REC");
  return badges;
}

export function featureLabel(flags: ProductFeatureFlags): string {
  return featureBadges(flags).join(" · ");
}

/** Ürün adı / kod / renk metninden 3D ve REC işaretlerini çıkarır. */
export function parseFeaturesFromText(text: string): ProductFeatureFlags {
  const v = text.toUpperCase();
  return {
    feature3D: /\b3D\b/.test(v),
    featureRec: /\bREC\b/.test(v),
  };
}

export function variantIdentityKey(parts: {
  size: string;
  surface: string;
  quality: string;
  feature3D: boolean;
  featureRec: boolean;
}) {
  return `${parts.size}|${parts.surface}|${parts.quality}|${parts.feature3D ? 1 : 0}|${parts.featureRec ? 1 : 0}`;
}

/** Matrix planlama: özellik bayrakları aile düzeyinde güncellenir, varyant eşleşmesi buna göre yapılmaz. */
export function variantMatrixKey(parts: {
  size: string;
  surface: string;
  quality: string;
}) {
  return `${parts.size}|${parts.surface}|${parts.quality}`;
}
