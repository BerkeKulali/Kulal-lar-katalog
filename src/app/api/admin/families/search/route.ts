import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * Aile arama (benzer ürün picker'ı). Markalar arası; hedef aile herhangi bir
 * markadan olabilir. Yetki: families.
 */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const excludeId = searchParams.get("excludeId")?.trim() || undefined;

  const families = await prisma.productFamily.findMany({
    where: {
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: [{ brand: { sortOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      brand: { select: { name: true } },
    },
    take: 30,
  });

  return NextResponse.json({
    items: families.map((f) => ({
      id: f.id,
      name: f.name,
      brandName: f.brand.name,
    })),
  });
}
