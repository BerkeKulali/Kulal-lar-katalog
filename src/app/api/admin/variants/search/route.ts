import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { surfaceDisplayLabel } from "@/lib/constants";
import { qualityLabel } from "@/lib/utils";

export async function GET(request: Request) {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 40), 1),
    80
  );

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      ...(auth.admin.brandId
        ? { family: { brandId: auth.admin.brandId } }
        : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { family: { name: { contains: q } } },
            ],
          }
        : {}),
    },
    take: limit,
    orderBy: [{ family: { name: "asc" } }, { size: "asc" }, { surface: "asc" }],
    select: {
      id: true,
      size: true,
      surface: true,
      quality: true,
      price: true,
      code: true,
      family: {
        select: {
          name: true,
          brand: { select: { name: true } },
        },
      },
    },
  });

  const items = variants.map((v) => ({
    id: v.id,
    label: `${v.family.name} · ${v.size.toUpperCase()} · ${surfaceDisplayLabel(v.surface)} · ${qualityLabel(v.quality)}${v.code ? ` · ${v.code}` : ""}`,
    price: v.price,
    brandName: v.family.brand.name,
  }));

  return NextResponse.json({ items });
}
