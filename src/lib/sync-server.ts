import { prisma } from "@/lib/prisma";
import { getActiveFamilyIds } from "@/lib/active-families";

export async function buildCatalogSync(since?: Date) {
  const settings = await prisma.appSettings.findUnique({
    where: { id: "default" },
  });

  const priceListVersion = (
    settings?.lastPriceListUpdate ?? new Date(0)
  ).toISOString();

  const activeFamilyIds = since ? null : await getActiveFamilyIds();

  const variantWhere = since
    ? {
        isActive: true,
        OR: [
          { updatedAt: { gt: since } },
          { imageUpdatedAt: { gt: since } },
          { stockLines: { some: { updatedAt: { gt: since } } } },
        ],
      }
    : activeFamilyIds && activeFamilyIds.length > 0
      ? { isActive: true, familyId: { in: activeFamilyIds } }
      : { isActive: true, familyId: { in: ["__none__"] } };

  const familyWhere = since
    ? {
        OR: [
          { updatedAt: { gt: since } },
          { imageUpdatedAt: { gt: since } },
          { variants: { some: variantWhere } },
        ],
      }
    : { isActive: true };

  const [variants, families, variantImageMax, familyImageMax] =
    await Promise.all([
      prisma.productVariant.findMany({
        where: variantWhere,
        include: {
          stockLines: true,
          family: { include: { brand: true } },
        },
      }),
      prisma.productFamily.findMany({
        where: familyWhere,
        include: { brand: true },
      }),
      prisma.productVariant.aggregate({ _max: { imageUpdatedAt: true } }),
      prisma.productFamily.aggregate({ _max: { imageUpdatedAt: true } }),
    ]);

  const t1 = variantImageMax._max.imageUpdatedAt?.getTime() ?? 0;
  const t2 = familyImageMax._max.imageUpdatedAt?.getTime() ?? 0;
  const imageCatalogVersion = new Date(Math.max(t1, t2)).toISOString();

  return {
    priceListVersion,
    imageCatalogVersion,
    serverTime: new Date().toISOString(),
    variants: variants.map((v) => ({
      id: v.id,
      familyId: v.familyId,
      brandSlug: v.family.brand.slug,
      size: v.size,
      surface: v.surface,
      quality: v.quality,
      price: v.price,
      code: v.code,
      stockM2: v.stockLines.reduce((s, l) => s + l.quantityM2, 0),
      imageUrl: v.imageUrl,
      imageUpdatedAt: v.imageUpdatedAt?.toISOString() ?? null,
      updatedAt: v.updatedAt.toISOString(),
    })),
    families: families.map((f) => ({
      id: f.id,
      brandSlug: f.brand.slug,
      slug: f.slug,
      name: f.name,
      imageUrl: f.imageUrl,
      imageUpdatedAt: f.imageUpdatedAt?.toISOString() ?? null,
      updatedAt: f.updatedAt.toISOString(),
      isActive: f.isActive,
    })),
    isDelta: Boolean(since),
  };
}
