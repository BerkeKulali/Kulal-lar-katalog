import { prisma } from "@/lib/prisma";

/** Aktif ürün ailelerinin id listesi (variant sorgularında kullanılır) */
export async function getActiveFamilyIds(brandId?: string) {
  const rows = await prisma.productFamily.findMany({
    where: {
      isActive: true,
      ...(brandId ? { brandId } : {}),
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}
