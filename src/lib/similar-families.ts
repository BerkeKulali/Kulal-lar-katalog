import { prisma } from "@/lib/prisma";
import {
  brandVisibilityFilter,
  type CatalogAudience,
} from "@/lib/catalog-audience";
import { getSizesForBrand } from "@/lib/constants";
import { pickSizeListImage, toImageCandidates } from "@/lib/product-image";

export type SimilarFamilyItem = {
  id: string;
  name: string;
  slug: string;
  brandSlug: string;
  brandName: string;
  /** Detay linki için hedef ölçü. */
  size: string;
  imageUrl: string | null;
};

type SimilarVariant = { size: string; quality: string; imageUrl: string | null };

/** Ailenin ölçüleri arasından "birincil" olanı marka sırasına göre seçer. */
function pickPrimarySize(brandSlug: string, variants: SimilarVariant[]): string {
  const available = new Set(variants.map((v) => v.size));
  const ordered = getSizesForBrand(brandSlug).find((s) => available.has(s));
  return ordered ?? variants[0]?.size ?? "";
}

/**
 * Bir ailenin benzer ürünlerini görüntüleme bilgisiyle döner.
 * audience verilirse marka görünürlüğüne göre filtreler (bayilerde gizli
 * markalar çıkar); verilmezse (admin) hepsi döner.
 */
export async function getSimilarFamilies(
  familyId: string,
  audience?: CatalogAudience
): Promise<SimilarFamilyItem[]> {
  let rows;
  try {
    rows = await prisma.similarFamily.findMany({
      where: {
        familyId,
        similarFamily: {
          isActive: true,
          // Görünürlük Brand alanlarında (isVisible / visibleToDealers);
          // aileye değil, ilişkili markaya uygulanır.
          ...(audience ? { brand: brandVisibilityFilter(audience) } : {}),
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        similarFamily: {
          include: {
            brand: { select: { name: true, slug: true } },
            variants: {
              where: { isActive: true },
              select: { size: true, quality: true, imageUrl: true },
            },
          },
        },
      },
    });
  } catch (err) {
    // Benzer ürünler opsiyoneldir: sorgu hatası (ör. migration henüz
    // uygulanmadıysa) katalogu çökertmesin.
    console.error("getSimilarFamilies failed:", err);
    return [];
  }

  return rows
    .map(({ similarFamily: fam }) => {
      const size = pickPrimarySize(fam.brand.slug, fam.variants);
      if (!size) return null;
      const sizeVariants = fam.variants.filter((v) => v.size === size);
      return {
        id: fam.id,
        name: fam.name,
        slug: fam.slug,
        brandSlug: fam.brand.slug,
        brandName: fam.brand.name,
        size,
        imageUrl: pickSizeListImage(
          fam.imageUrl,
          toImageCandidates(sizeVariants),
          size
        ),
      } satisfies SimilarFamilyItem;
    })
    .filter((x): x is SimilarFamilyItem => x !== null);
}

/**
 * Bir ailenin benzer ürün kümesini yeniden yazar (simetrik).
 * familyId'ye dokunan tüm çiftler silinip hedef küme iki yönlü eklenir;
 * böylece ilişki her iki üründe de tutarlı görünür.
 */
export async function saveSimilarFamilies(
  familyId: string,
  similarIds: string[]
): Promise<{ saved: number }> {
  const requested = [
    ...new Set(
      similarIds.filter((id) => typeof id === "string" && id && id !== familyId)
    ),
  ];

  // Yalnızca var olan aileleri kabul et.
  const existing = requested.length
    ? await prisma.productFamily.findMany({
        where: { id: { in: requested } },
        select: { id: true },
      })
    : [];
  const validIds = existing.map((e) => e.id);

  await prisma.$transaction(async (tx) => {
    await tx.similarFamily.deleteMany({
      where: { OR: [{ familyId }, { similarFamilyId: familyId }] },
    });
    for (let i = 0; i < validIds.length; i += 1) {
      const sid = validIds[i];
      await tx.similarFamily.createMany({
        data: [
          { familyId, similarFamilyId: sid, sortOrder: i },
          { familyId: sid, similarFamilyId: familyId, sortOrder: i },
        ],
      });
    }
  });

  return { saved: validIds.length };
}
