import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;

  // Marka yöneticisi yalnızca kendi markasının ürünlerini görür.
  const brandFilter = auth.admin.brandId
    ? { family: { brandId: auth.admin.brandId } }
    : {};

  const stats = await prisma.familyClickStat.findMany({
    where: brandFilter,
    orderBy: { count: "desc" },
    take: 300,
    include: {
      family: {
        select: {
          name: true,
          slug: true,
          isActive: true,
          brand: { select: { name: true, slug: true } },
        },
      },
    },
  });

  const items = stats.map((s) => ({
    familyId: s.familyId,
    count: s.count,
    updatedAt: s.updatedAt,
    familyName: s.family.name,
    familySlug: s.family.slug,
    brandName: s.family.brand.name,
    brandSlug: s.family.brand.slug,
    isActive: s.family.isActive,
  }));

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return NextResponse.json({ items, total });
}
