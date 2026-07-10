import { normalizeSize, getSizesForBrand, getSurfacesForBrand } from "@/lib/constants";
import {
  normalizeProductFeatures,
  variantMatrixKey,
  type ProductFeatureFlags,
} from "@/lib/product-features";
import { toSurface } from "@/lib/surface";
import type { Quality, Surface } from "@/generated/prisma/client";

export const ALL_QUALITIES: Quality[] = ["FIRST", "END"];

/** ölçü → yüzey listesi */
export type SurfaceMatrix = Record<string, string[]>;

export type SizePackaging = {
  palletM2?: number | null;
  boxM2?: number | null;
  truckM2?: number | null;
};

/** ölçü → palet / kutu / tır m² */
export type PackagingBySize = Record<string, SizePackaging>;

function parsePackM2(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1000) / 1000;
}

export function variantsToPackaging(
  variants: {
    size: string;
    palletM2: number | null;
    boxM2: number | null;
    truckM2: number | null;
  }[]
): PackagingBySize {
  const result: PackagingBySize = {};
  for (const v of variants) {
    if (result[v.size]) continue;
    result[v.size] = {
      palletM2: v.palletM2,
      boxM2: v.boxM2,
      truckM2: v.truckM2,
    };
  }
  return result;
}

export function normalizePackaging(
  input: PackagingBySize | undefined,
  sizes: string[]
): PackagingBySize {
  if (!input) return {};
  const allowed = new Set(sizes.map((s) => normalizeSize(s)));
  const result: PackagingBySize = {};
  for (const [rawSize, pack] of Object.entries(input)) {
    const size = normalizeSize(rawSize);
    if (!allowed.has(size)) continue;
    result[size] = {
      palletM2: parsePackM2(pack.palletM2),
      boxM2: parsePackM2(pack.boxM2),
      truckM2: parsePackM2(pack.truckM2),
    };
  }
  return result;
}

export function packagingSizes(matrix: SurfaceMatrix): string[] {
  return matrixSizes(matrix);
}

export function prunePackaging(
  packaging: PackagingBySize,
  sizes: string[]
): PackagingBySize {
  const allowed = new Set(sizes.map((s) => normalizeSize(s)));
  const next: PackagingBySize = {};
  for (const [size, pack] of Object.entries(packaging)) {
    if (allowed.has(normalizeSize(size))) {
      next[size] = pack;
    }
  }
  return next;
}

export function surfacesForBrand(brandSlug: string): Surface[] {
  return getSurfacesForBrand(brandSlug) as Surface[];
}

export function variantsToMatrix(
  variants: { size: string; surface: string }[]
): SurfaceMatrix {
  const matrix: SurfaceMatrix = {};
  for (const v of variants) {
    if (!matrix[v.size]) matrix[v.size] = [];
    if (!matrix[v.size].includes(v.surface)) {
      matrix[v.size].push(v.surface);
    }
  }
  for (const size of Object.keys(matrix)) {
    matrix[size].sort();
  }
  return matrix;
}

export function isUniformMatrix(matrix: SurfaceMatrix): boolean {
  const sizes = Object.keys(matrix);
  if (sizes.length === 0) return true;
  const first = [...(matrix[sizes[0]] ?? [])].sort().join(",");
  return sizes.every(
    (s) => [...(matrix[s] ?? [])].sort().join(",") === first
  );
}

export function uniformToMatrix(
  sizes: string[],
  surfaces: string[]
): SurfaceMatrix {
  const matrix: SurfaceMatrix = {};
  for (const size of sizes) {
    matrix[size] = [...surfaces];
  }
  return matrix;
}

export function matrixSizes(matrix: SurfaceMatrix): string[] {
  return Object.keys(matrix).sort();
}

export function normalizeMatrix(
  input: SurfaceMatrix,
  brandSlug: string
): SurfaceMatrix {
  const allowed = new Set(getSurfacesForBrand(brandSlug));
  const matrix: SurfaceMatrix = {};

  for (const [rawSize, rawSurfaces] of Object.entries(input)) {
    const size = normalizeSize(rawSize);
    if (!getSizesForBrand(brandSlug).includes(size)) continue;

    const surfaces = [...new Set(rawSurfaces.map((s) => s.toUpperCase()))]
      .filter((s) => allowed.has(s))
      .sort();

    if (surfaces.length > 0) {
      matrix[size] = surfaces;
    }
  }
  return matrix;
}

export function countMatrixVariants(matrix: SurfaceMatrix): number {
  let n = 0;
  for (const surfaces of Object.values(matrix)) {
    n += surfaces.length * ALL_QUALITIES.length;
  }
  return n;
}

export function matrixFromUniform(
  sizes: string[],
  surfaces: string[],
  brandSlug: string
): SurfaceMatrix {
  const allowed = new Set(getSurfacesForBrand(brandSlug));
  const allowedSizes = new Set(getSizesForBrand(brandSlug));
  const normalizedSizes = sizes
    .map((s) => normalizeSize(s))
    .filter((s) => allowedSizes.has(s));

  const normalizedSurfaces = surfaces
    .map((s) => s.toUpperCase())
    .filter((s) => allowed.has(s));

  return uniformToMatrix(normalizedSizes, normalizedSurfaces);
}

export function buildVariantPlan<
  T extends {
    id: string;
    size: string;
    surface: Surface;
    quality: Quality;
    feature3D: boolean;
    featureRec: boolean;
    _count?: { orderLines: number };
  },
>(
  matrix: SurfaceMatrix,
  familyName: string,
  existing: T[],
  familyId: string,
  features: ProductFeatureFlags,
  variantCodeFn: (
    name: string,
    surface: Surface,
    quality: Quality,
    flags: ProductFeatureFlags
  ) => string
) {
  const normalizedFeatures = normalizeProductFeatures(features);
  const desiredKeys = new Set<string>();
  const toCreate: {
    familyId: string;
    size: string;
    surface: Surface;
    quality: Quality;
    feature3D: boolean;
    featureRec: boolean;
    code: string;
  }[] = [];

  for (const [size, surfaces] of Object.entries(matrix)) {
    for (const surface of surfaces) {
      for (const quality of ALL_QUALITIES) {
        const key = variantMatrixKey({ size, surface, quality });
        desiredKeys.add(key);

        const exists = existing.some(
          (v) =>
            variantMatrixKey({
              size: v.size,
              surface: v.surface,
              quality: v.quality,
            }) === key
        );

        if (!exists) {
          toCreate.push({
            familyId,
            size,
            surface: toSurface(surface),
            quality,
            feature3D: normalizedFeatures.feature3D,
            featureRec: normalizedFeatures.featureRec,
            code: variantCodeFn(
              familyName,
              toSurface(surface),
              quality,
              normalizedFeatures
            ),
          });
        }
      }
    }
  }

  const toRemove = existing.filter((v) => {
    const key = variantMatrixKey({
      size: v.size,
      surface: v.surface,
      quality: v.quality,
    });
    return !desiredKeys.has(key);
  });

  return { toCreate, toRemove, desiredKeys };
}

export type VariantInPlaceUpdate = {
  id: string;
  surface: Surface;
  feature3D: boolean;
  featureRec: boolean;
  code: string;
};

/** Aynı ölçü+kalite için yüzey değişiminde silip yeniden oluşturmak yerine yerinde güncelle. */
export function reconcileVariantPlan<
  T extends {
    id: string;
    size: string;
    quality: Quality;
    _count?: { orderLines: number };
  },
>(
  toCreate: {
    familyId: string;
    size: string;
    surface: Surface;
    quality: Quality;
    feature3D: boolean;
    featureRec: boolean;
    code: string;
  }[],
  toRemove: T[]
) {
  const pairedRemoveIds = new Set<string>();
  const toUpdate: VariantInPlaceUpdate[] = [];
  const remainingCreate = [...toCreate];

  for (const remove of toRemove) {
    if ((remove._count?.orderLines ?? 0) > 0) continue;

    const matchIdx = remainingCreate.findIndex(
      (create) =>
        create.size === remove.size && create.quality === remove.quality
    );
    if (matchIdx === -1) continue;

    const create = remainingCreate[matchIdx]!;
    toUpdate.push({
      id: remove.id,
      surface: create.surface,
      feature3D: create.feature3D,
      featureRec: create.featureRec,
      code: create.code,
    });
    pairedRemoveIds.add(remove.id);
    remainingCreate.splice(matchIdx, 1);
  }

  return {
    toCreate: remainingCreate,
    toRemove: toRemove.filter((variant) => !pairedRemoveIds.has(variant.id)),
    toUpdate,
  };
}
