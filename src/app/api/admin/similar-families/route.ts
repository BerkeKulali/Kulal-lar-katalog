import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * Benzer ürün yönetimi için aile listesi + benzer sayısı.
 * Marka yöneticisi yalnızca kendi markasının ailelerini düzenler; hedefler
 * (benzer olarak eklenenler) markalar arası olabilir. Yetki: families.
 */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const brandId = searchParams.get("brandId")?.trim() || undefined;

  const families = await prisma.productFamily.findMany({
    where: {
      isActive: true,
      brandId: admin.brandId ?? brandId,
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: [{ brand: { sortOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      brand: { select: { name: true } },
      _count: { select: { similarOf: true } },
    },
    take: 1000,
  });

  return NextResponse.json({
    items: families.map((f) => ({
      id: f.id,
      name: f.name,
      brandName: f.brand.name,
      similarCount: f._count.similarOf,
    })),
  });
}
