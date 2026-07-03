import type { AdminUser } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSize } from "@/lib/constants";
import {
  syncEndPriceForFirstVariant,
} from "@/lib/end-price-sync";
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

export async function importPriceRows(
  rows: PriceImportRow[],
  mode: string,
  admin: Pick<AdminUser, "brandId">
): Promise<PriceImportResult> {
  const results: PriceImportResult = {
    updated: 0,
    created: 0,
    errors: [],
  };

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2;
    try {
      const brandSlug = String(row.marka_slug ?? row.marka ?? "")
        .trim()
        .toLowerCase();
      const familyName = String(row.aile ?? "").trim();
      const size = normalizeSize(String(row.olcu ?? ""));
      const surface = parseSurface(String(row.yuzey ?? ""));
      const quality = parseQuality(String(row.kalite ?? ""));
      const price = Number(row.fiyat);
      const code = row.kod ? String(row.kod).trim() : null;

      if (!brandSlug || !familyName || !size || !surface || !quality) {
        throw new Error("Eksik alan");
      }
      if (!Number.isFinite(price)) {
        throw new Error("Geçersiz fiyat");
      }

      const brand = await prisma.brand.findFirst({
        where: {
          OR: [{ slug: brandSlug }, { name: { contains: brandSlug } }],
        },
      });

      if (!brand) throw new Error("Marka bulunamadı");
      if (admin.brandId && admin.brandId !== brand.id) {
        throw new Error("Bu markaya yetkiniz yok");
      }

      let family = await prisma.productFamily.findFirst({
        where: { brandId: brand.id, name: familyName },
      });

      if (!family) {
        if (mode === "update-only") {
          throw new Error("Aile bulunamadı");
        }
        family = await prisma.productFamily.create({
          data: {
            brandId: brand.id,
            name: familyName,
            slug: slugify(familyName),
          },
        });
        results.created++;
      }

      const existing = await prisma.productVariant.findFirst({
        where: {
          familyId: family.id,
          size,
          surface,
          quality,
        },
      });

      if (existing) {
        await prisma.productVariant.update({
          where: { id: existing.id },
          data: { price, code: code ?? existing.code },
        });
        results.updated++;
        if (quality === "FIRST") {
          await syncEndPriceForFirstVariant({
            familyId: family.id,
            size,
            surface,
            price,
          });
        }
      } else {
        if (mode === "update-only") {
          throw new Error("Variant bulunamadı");
        }
        await prisma.productVariant.create({
          data: {
            familyId: family.id,
            size,
            surface,
            quality,
            price,
            code,
          },
        });
        results.created++;
      }
    } catch (err) {
      results.errors.push(
        `Satır ${rowNum}: ${err instanceof Error ? err.message : "Hata"}`
      );
    }
  }

  if (results.updated > 0 || results.created > 0) {
    await prisma.appSettings.upsert({
      where: { id: "default" },
      update: { lastPriceListUpdate: new Date() },
      create: { id: "default", lastPriceListUpdate: new Date() },
    });
  }

  return results;
}
