import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { hasAnyPermission } from "@/lib/admin-permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  if (
    !hasAnyPermission(admin, [
      "families",
      "images",
      "prices",
      "import",
      "admins",
    ])
  ) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz yok" },
      { status: 403 }
    );
  }

  const brands = await prisma.brand.findMany({
    where: admin.brandId ? { id: admin.brandId } : undefined,
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const families = await prisma.productFamily.findMany({
    where: admin.brandId ? { brandId: admin.brandId } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      brandId: true,
      variants: {
        select: {
          id: true,
          size: true,
          surface: true,
          quality: true,
          imageUrl: true,
        },
        orderBy: [{ size: "asc" }, { surface: "asc" }],
      },
    },
  });

  return NextResponse.json({ brands, families });
}
