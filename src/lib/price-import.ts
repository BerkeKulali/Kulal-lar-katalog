import type { AdminUser, Quality, Surface } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSize } from "@/lib/constants";
import { guralPackagingForSize } from "@/lib/gural-packaging";
import { endPriceFromFirst, variantCode } from "@/lib/prices";
import { parseQuality, parseSurface, slugify } from "@/lib/utils";

export type PriceImportRow = {
  marka_slug?: string;
  marka?: string;
  aile: string;
  olcu: string;
  yuzey: string;
  kalite: string;
  fiyat: number;
  kod?: string | null;
};

export type PriceImportResult = {
  updated: number;
  created: number;
  errors: string[];
};

type FamilyCache = { id: string; name: string; slug: string };
type VariantCache = {
  id: string;
  code: string | null;
};

export type PriceImportContext = {
  brandId: string;
  brandSlug: string;
  mode: string;
  families: Map<string, FamilyCache>;
  familiesBySlug: Map<string, FamilyCache>;
  variants: Map<string, VariantCache>;
  skipEndSync: boolean;
};

function variantCacheKey(
  familyId: string,
  size: string,
  surface: Surface,
  quality: Quality
) {
  return `${familyId}|${size}|${surface}|${quality}`;
}

export async function createPriceImportContext(
  brandSlug: string,
  mode: string,
  admin: Pick<AdminUser, "brandId">,
  options?: { skipEndSync?: boolean }
): Promise<PriceImportContext | null> {
  const slug = brandSlug.trim().toLowerCase();
  const brand = await prisma.brand.findFirst({
    where: {
      OR: [{ slug }, { name: { contains: slug } }],
    },
    select: { id: true, slug: true },
  });

  if (!brand) return null;
  if (admin.brandId && admin.brandId !== brand.id) return null;

  const [families, variants] = await Promise.all([
    prisma.productFamily.findMany({
      where: { brandId: brand.id },
      select: { id: true, name: true, slug: true },
    }),
    prisma.productVariant.findMany({
      where: { family: { brandId: brand.id } },
      select: {
        id: true,
        familyId: true,
        size: true,
        surface: true,
        quality: true,
        code: true,
      },
    }),
  ]);

  const familyMap = new Map<string, FamilyCache>();
  const familySlugMap = new Map<string, FamilyCache>();
  for (const family of families) {
    familyMap.set(family.name, family);
    familySlugMap.set(family.slug, family);
    familySlugMap.set(slugify(family.name), family);
  }

  const variantMap = new Map<string, VariantCache>();
  for (const variant of variants) {
    variantMap.set(
      variantCacheKey(
        variant.familyId,
        variant.size,
        variant.surface,
        variant.quality
      ),
      { id: variant.id, code: variant.code }
    );
  }

  return {
    brandId: brand.id,
    brandSlug: brand.slug,
    mode,
    families: familyMap,
    familiesBySlug: familySlugMap,
    variants: variantMap,
    skipEndSync: options?.skipEndSync ?? true,
  };
}

export async function importPriceRows(
  rows: PriceImportRow[],
  mode: string,
  admin: Pick<AdminUser, "brandId">,
  options?: { skipEndSync?: boolean }
): Promise<PriceImportResult> {
  const brandSlug = String(rows[0]?.marka_slug ?? rows[0]?.marka ?? "")
    .trim()
    .toLowerCase();
  if (!brandSlug) {
    return { updated: 0, created: 0, errors: ["Marka bulunamadı"] };
  }

  const ctx = await createPriceImportContext(brandSlug, mode, admin, options);
  if (!ctx) {
    return { updated: 0, created: 0, errors: ["Marka bulunamadı veya yetki yok"] };
  }

  const results = await importPriceRowsWithContext(rows, ctx, 0);

  if (results.updated > 0 || results.created > 0) {
    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: { lastPriceListUpdate: new Date() },
      create: { id: "default", lastPriceListUpdate: new Date() },
    });
  }

  return results;
}

function registerFamily(ctx: PriceImportContext, family: FamilyCache) {
  ctx.families.set(family.name, family);
  ctx.familiesBySlug.set(family.slug, family);
  ctx.familiesBySlug.set(slugify(family.name), family);
}

async function resolveOrCreateFamily(
  ctx: PriceImportContext,
  familyName: string
): Promise<{ family: FamilyCache | null; created: boolean }> {
  const cached =
    ctx.families.get(familyName) ??
    ctx.familiesBySlug.get(slugify(familyName));
  if (cached) {
    ctx.families.set(familyName, cached);
    return { family: cached, created: false };
  }

  if (ctx.mode === "update-only") return { family: null, created: false };

  const familySlug = slugify(familyName);
  const existing = await prisma.productFamily.findUnique({
    where: { brandId_slug: { brandId: ctx.brandId, slug: familySlug } },
    select: { id: true, name: true, slug: true },
  });
  if (existing) {
    registerFamily(ctx, existing);
    ctx.families.set(familyName, existing);
    return { family: existing, created: false };
  }

  const created = await prisma.productFamily.create({
    data: {
      brandId: ctx.brandId,
      name: familyName,
      slug: familySlug,
    },
    select: { id: true, name: true, slug: true },
  });
  registerFamily(ctx, created);
  return { family: created, created: true };
}

export async function importPriceRowsWithContext(
  rows: PriceImportRow[],
  ctx: PriceImportContext,
  rowOffset = 0
): Promise<PriceImportResult> {
  const results: PriceImportResult = {
    updated: 0,
    created: 0,
    errors: [],
  };

  for (const [index, row] of rows.entries()) {
    const rowNum = rowOffset + index + 2;
    try {
      const familyName = String(row.aile ?? "").trim();
      const size = normalizeSize(String(row.olcu ?? ""));
      const surface = parseSurface(String(row.yuzey ?? ""));
      const quality = parseQuality(String(row.kalite ?? ""));
      const price = Number(row.fiyat);
      const code = row.kod ? String(row.kod).trim() : null;

      if (!familyName || !size || !surface || !quality) {
        throw new Error("Eksik alan");
      }
      if (!Number.isFinite(price)) {
        throw new Error("Geçersiz fiyat");
      }

      const { family, created: familyCreated } = await resolveOrCreateFamily(
        ctx,
        familyName
      );
      if (!family) {
        throw new Error("Aile bulunamadı");
      }
      if (familyCreated) {
        results.created++;
      }

      const vKey = variantCacheKey(family.id, size, surface, quality);
      const existing = ctx.variants.get(vKey);

      const pack = ctx.brandSlug === "gural" ? guralPackagingForSize(size) : null;
      const packData = pack
        ? { palletM2: pack.palletM2, boxM2: pack.boxM2 }
        : {};

      if (existing) {
        await prisma.productVariant.update({
          where: { id: existing.id },
          data: { price, code: code ?? existing.code, ...packData },
        });
        results.updated++;
      } else {
        if (ctx.mode === "update-only") {
          throw new Error("Variant bulunamadı");
        }
        const created = await prisma.productVariant.create({
          data: {
            familyId: family.id,
            size,
            surface,
            quality,
            price,
            code,
            ...packData,
          },
          select: { id: true, code: true },
        });
        ctx.variants.set(vKey, created);
        results.created++;
      }

      if (quality === "FIRST" && ctx.brandSlug === "gural") {
        await upsertGuralEndVariant(
          ctx,
          family,
          size,
          surface,
          price,
          results
        );
      }
    } catch (err) {
      results.errors.push(
        `Satır ${rowNum}: ${err instanceof Error ? err.message : "Hata"}`
      );
    }
  }

  return results;
}

async function upsertGuralEndVariant(
  ctx: PriceImportContext,
  family: FamilyCache,
  size: string,
  surface: Surface,
  firstPrice: number,
  results: PriceImportResult
) {
  if (ctx.brandSlug !== "gural" || firstPrice <= 0) return;

  const endPrice = endPriceFromFirst(firstPrice);
  const pack = guralPackagingForSize(size);
  const packData = pack ? { palletM2: pack.palletM2, boxM2: pack.boxM2 } : {};
  const endKey = variantCacheKey(family.id, size, surface, "END");
  const existing = ctx.variants.get(endKey);

  if (existing) {
    await prisma.productVariant.update({
      where: { id: existing.id },
      data: { price: endPrice, ...packData },
    });
    results.updated++;
  } else {
    const created = await prisma.productVariant.create({
      data: {
        familyId: family.id,
        size,
        surface,
        quality: "END",
        price: endPrice,
        code: variantCode(family.name, surface, "END"),
        ...packData,
      },
      select: { id: true, code: true },
    });
    ctx.variants.set(endKey, created);
    results.created++;
  }
}

export async function touchPriceListUpdated() {
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: { lastPriceListUpdate: new Date() },
    create: { id: "default", lastPriceListUpdate: new Date() },
  });
}
