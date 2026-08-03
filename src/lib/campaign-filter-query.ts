/**
 * Ürün segmenti filtresinin DB'ye bağlı kısmı: `campaign-filter.ts`'teki saf
 * `applyProductFilter`'ı, `stock/list/route.ts`'teki chunk + groupBy stok
 * toplama deseniyle beslenen Prisma verisiyle çalıştırır. Üç export
 * route'u (JSON önizleme, Excel, PDF) bu tek fonksiyonu paylaşır.
 */
import {
  applyProductFilter,
  type FilterBasis,
  type FilterCriteria,
  type FilterQuality,
  type FilterRow,
  type VariantForFilter,
} from "@/lib/campaign-filter";
import { normalizeSize } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { isPrismaSurface } from "@/lib/surface";
import { chunk } from "@/lib/utils";
import type { Surface } from "@/generated/prisma/enums";

const STOCK_CHUNK = 100;

export type FilterQueryScope = {
  /** Marka-kısıtlı admin ise yalnızca bu marka görülür (submit edilen brandIds yok sayılır). */
  adminBrandId: string | null;
};

export async function runProductFilter(
  criteria: FilterCriteria,
  scope: FilterQueryScope
): Promise<FilterRow[]> {
  const effectiveBrandIds = scope.adminBrandId
    ? [scope.adminBrandId]
    : criteria.brandIds;

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      ...(criteria.quality ? { quality: criteria.quality } : {}),
      ...(criteria.sizes.length > 0 ? { size: { in: criteria.sizes } } : {}),
      ...(criteria.surfaces.length > 0
        ? { surface: { in: criteria.surfaces as Surface[] } }
        : {}),
      family: {
        isActive: true,
        ...(effectiveBrandIds.length > 0
          ? { brandId: { in: effectiveBrandIds } }
          : {}),
        ...(criteria.materialType ? { materialType: criteria.materialType } : {}),
      },
    },
    select: {
      id: true,
      familyId: true,
      size: true,
      surface: true,
      quality: true,
      family: {
        select: {
          name: true,
          materialType: true,
          brandId: true,
          brand: { select: { name: true } },
        },
      },
    },
    take: 5000,
  });

  const stockByVariant = new Map<string, number>();
  for (const idChunk of chunk(variants.map((v) => v.id), STOCK_CHUNK)) {
    if (idChunk.length === 0) continue;
    const grouped = await prisma.stockLine.groupBy({
      by: ["variantId"],
      where: { variantId: { in: idChunk } },
      _sum: { quantityM2: true },
    });
    for (const g of grouped) {
      stockByVariant.set(g.variantId, g._sum.quantityM2 ?? 0);
    }
  }

  const forFilter: VariantForFilter[] = variants.map((v) => ({
    variantId: v.id,
    familyId: v.familyId,
    familyName: v.family.name,
    brandId: v.family.brandId,
    brandName: v.family.brand.name,
    materialType: v.family.materialType,
    size: v.size,
    surface: v.surface,
    quality: v.quality as FilterQuality,
    stockM2: stockByVariant.get(v.id) ?? 0,
  }));

  return applyProductFilter(forFilter, { ...criteria, brandIds: effectiveBrandIds });
}

export type ParsedFilterCriteria = FilterCriteria;

/** Query string → FilterCriteria. Hatalıysa { error } döner. */
export function parseFilterCriteriaFromSearchParams(
  searchParams: URLSearchParams
): ParsedFilterCriteria | { error: string } {
  const brandIds = (searchParams.get("brandIds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const materialType = searchParams.get("materialType")?.trim() || null;

  const qualityRaw = searchParams.get("quality")?.trim().toUpperCase() || "";
  if (qualityRaw && qualityRaw !== "FIRST" && qualityRaw !== "END") {
    return { error: "Geçersiz kalite" };
  }
  const quality = (qualityRaw || null) as FilterQuality | null;

  const basisRaw = searchParams.get("basis")?.trim() || "variant";
  if (basisRaw !== "family" && basisRaw !== "variant") {
    return { error: "Geçersiz basis" };
  }
  const basis = basisRaw as FilterBasis;

  const minRaw = searchParams.get("minM2")?.trim();
  let minM2: number | null = null;
  if (minRaw) {
    minM2 = Number(minRaw);
    if (!Number.isFinite(minM2) || minM2 < 0) {
      return { error: "Geçerli bir 'en az m²' değeri girin" };
    }
  }

  const maxRaw = searchParams.get("maxM2")?.trim();
  let maxM2: number | null = null;
  if (maxRaw) {
    maxM2 = Number(maxRaw);
    if (!Number.isFinite(maxM2) || maxM2 < 0) {
      return { error: "Geçerli bir 'en çok m²' değeri girin" };
    }
  }

  if (minM2 != null && maxM2 != null && minM2 >= maxM2) {
    return { error: "'En az' değeri 'en çok' değerinden küçük olmalı" };
  }

  const sizes = (searchParams.get("sizes") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => normalizeSize(s));

  const surfacesRaw = (searchParams.get("surfaces") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const s of surfacesRaw) {
    if (!isPrismaSurface(s)) {
      return { error: `Geçersiz yüzey: ${s}` };
    }
  }
  const surfaces = surfacesRaw.map((s) => s.toUpperCase());

  return { brandIds, materialType, quality, basis, minM2, maxM2, sizes, surfaces };
}
