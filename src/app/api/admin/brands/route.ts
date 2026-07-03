import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const brands = await prisma.brand.findMany({
    where: admin.brandId ? { id: admin.brandId } : undefined,
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ brands });
}
