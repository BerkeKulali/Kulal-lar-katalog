import type { Surface } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSize } from "@/lib/constants";
import { GURAL_PACKAGING_BY_SIZE, guralPackagingForSize } from "@/lib/gural-packaging";
import { endPriceFromFirst, variantCode } from "@/lib/prices";

export type GuralSyncResult = {
  endCreated: number;
  endUpdated: number;
  packagingUpdated: number;
  firstVariantsProcessed: number;
  skippedNoPrice: number;
};

export async function syncGuralEndPricesAndPackaging(): Promise<GuralSyncResult> {
  const brand = await prisma.brand.findUnique({ where: { slug: "gural" } });
  if (!brand) {
    throw new Error("GÜRAL markası bulunamadı");
  }

  const result: GuralSyncResult = {
    endCreated: 0,
    endUpdated: 0,
    packagingUpdated: 0,
    firstVariantsProcessed: 0,
    skippedNoPrice: 0,
  };

  const [allVariants, families] = await Promise.all([
    prisma.productVariant.findMany({
      where: { family: { brandId: brand.id } },
      select: {
        id: true,
        familyId: true,
        size: true,
        surface: true,
        quality: true,
        price: true,
      },
    }),
    prisma.productFamily.findMany({
      where: { brandId: brand.id },
      select: { id: true, name: true },
    }),
  ]);

  const familyNames = new Map(families.map((f) => [f.id, f.name]));

  const byKey = new Map<
    string,
    { first?: (typeof allVariants)[0]; end?: (typeof allVariants)[0] }
  >();

  for (const v of allVariants) {
    const key = `${v.familyId}|${v.size}|${v.surface}`;
    const entry = byKey.get(key) ?? {};
    if (v.quality === "FIRST") entry.first = v;
    if (v.quality === "END") entry.end = v;
    byKey.set(key, entry);
  }

  const endCreates: {
    familyId: string;
    size: string;
    surface: Surface;
    quality: "END";
    price: number;
    code: string;
    palletM2: number | null;
    boxM2: number | null;
  }[] = [];

  const endUpdates: { id: string; price: number; palletM2: number | null; boxM2: number | null }[] =
    [];
  const firstPackUpdates: { id: string; palletM2: number; boxM2: number }[] = [];

  for (const [, pair] of byKey) {
    const first = pair.first;
    if (!first) continue;

    const pack = guralPackagingForSize(first.size);
    if (first.price == null || first.price <= 0) {
      result.skippedNoPrice++;
      continue;
    }

    result.firstVariantsProcessed++;
    const endPrice = endPriceFromFirst(first.price);
    const familyName = familyNames.get(first.familyId) ?? "GURAL";

    if (pair.end) {
      endUpdates.push({
        id: pair.end.id,
        price: endPrice,
        palletM2: pack?.palletM2 ?? null,
        boxM2: pack?.boxM2 ?? null,
      });
    } else {
      endCreates.push({
        familyId: first.familyId,
        size: first.size,
        surface: first.surface as Surface,
        quality: "END",
        price: endPrice,
        code: variantCode(familyName, first.surface as Surface, "END"),
        palletM2: pack?.palletM2 ?? null,
        boxM2: pack?.boxM2 ?? null,
      });
    }

    if (pack) {
      firstPackUpdates.push({
        id: first.id,
        palletM2: pack.palletM2,
        boxM2: pack.boxM2,
      });
    }
  }

  if (endCreates.length > 0) {
    await prisma.productVariant.createMany({ data: endCreates });
    result.endCreated = endCreates.length;
  }

  const BATCH = 50;
  for (let i = 0; i < endUpdates.length; i += BATCH) {
    const batch = endUpdates.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((row) =>
        prisma.productVariant.update({
          where: { id: row.id },
          data: {
            price: row.price,
            palletM2: row.palletM2,
            boxM2: row.boxM2,
          },
        })
      )
    );
  }
  result.endUpdated = endUpdates.length;

  for (let i = 0; i < firstPackUpdates.length; i += BATCH) {
    const batch = firstPackUpdates.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((row) =>
        prisma.productVariant.update({
          where: { id: row.id },
          data: { palletM2: row.palletM2, boxM2: row.boxM2 },
        })
      )
    );
  }

  for (const [size, pack] of Object.entries(GURAL_PACKAGING_BY_SIZE)) {
    const normalized = normalizeSize(size);
    const updated = await prisma.productVariant.updateMany({
      where: {
        family: { brandId: brand.id },
        size: normalized,
      },
      data: { palletM2: pack.palletM2, boxM2: pack.boxM2 },
    });
    result.packagingUpdated += updated.count;
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: { lastPriceListUpdate: new Date() },
    create: { id: "default", lastPriceListUpdate: new Date() },
  });

  return result;
}
