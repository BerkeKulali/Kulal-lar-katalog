import type { Quality } from "@/generated/prisma/client";
import { normalizeSize } from "@/lib/constants";
import { resolveProductImage } from "@/lib/image-url";

/** Uzun şerit ölçüler — aile görseli yerine ölçüye özel fotoğraf gerekir */
export const DISTINCT_IMAGE_SIZES = ["20x120", "30x90", "40x120"] as const;

export function sizeUsesDistinctImage(size: string) {
  return DISTINCT_IMAGE_SIZES.includes(
    normalizeSize(size) as (typeof DISTINCT_IMAGE_SIZES)[number]
  );
}

type ImageCandidate = { quality: string; imageUrl: string | null };

function pickFromVariants(variants: ImageCandidate[]) {
  const first = variants.find(
    (v) => v.quality === "FIRST" && resolveProductImage(v.imageUrl)
  );
  if (first?.imageUrl) return first.imageUrl;

  const any = variants.find((v) => resolveProductImage(v.imageUrl));
  return any?.imageUrl ?? null;
}

/** Katalog listesi: önce bu ölçünün variant görselleri, gerekirse aile görseli */
export function pickSizeListImage(
  familyImage: string | null,
  variants: ImageCandidate[],
  size?: string
) {
  const fromVariants = pickFromVariants(variants);
  if (fromVariants) return fromVariants;

  if (size && sizeUsesDistinctImage(size)) return null;

  return resolveProductImage(familyImage) ? familyImage : null;
}

/** Ürün detayı: seçili variant → aynı ölçüdeki diğer variantlar → aile */
export function pickVariantDisplayImage(
  variant: ImageCandidate,
  sizeVariants: ImageCandidate[],
  familyImage: string | null,
  size: string
) {
  if (resolveProductImage(variant.imageUrl)) return variant.imageUrl;
  return pickSizeListImage(familyImage, sizeVariants, size);
}

export function toImageCandidates(
  rows: { quality: Quality | string; imageUrl: string | null }[]
): ImageCandidate[] {
  return rows.map((r) => ({ quality: r.quality, imageUrl: r.imageUrl }));
}
