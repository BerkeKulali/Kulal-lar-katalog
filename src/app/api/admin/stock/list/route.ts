import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { surfaceDisplayLabel } from "@/lib/constants";
import { featureBadges } from "@/lib/product-features";
import { prisma } from "@/lib/prisma";
import { chunk, qualityLabel } from "@/lib/utils";

/** Turso parametre limitini aşmamak için IN sorguları bu boyutta parçalanır. */
const CHUNK = 100;

/** Stok yönetimi ekranı için varyant + mevcut stok listesi. Yetki: stock. */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("stock");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const brandId = searchParams.get("brandId")?.trim() || undefined;

  try {
    const variants = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        family: {
          isActive: true,
          brandId: admin.brandId ?? brandId,
        },
        ...(q
          ? {
              OR: [
                { code: { contains: q } },
                { family: { name: { contains: q } } },
              ],
            }
          : {}),
      },
      orderBy: [
        { family: { brand: { sortOrder: "asc" } } },
        { family: { name: "asc" } },
        { size: "asc" },
        { surface: "asc" },
        { quality: "asc" },
      ],
      select: {
        id: true,
        size: true,
        surface: true,
        quality: true,
        feature3D: true,
        featureRec: true,
        code: true,
        family: {
          select: { name: true, brand: { select: { name: true } } },
        },
      },
      take: 1000,
    });

    // Mevcut stok, parçalı gruplama ile toplanır (Turso parametre limiti).
    const stockByVariant = new Map<string, number>();
    for (const idChunk of chunk(variants.map((v) => v.id), CHUNK)) {
      const grouped = await prisma.stockLine.groupBy({
        by: ["variantId"],
        where: { variantId: { in: idChunk } },
        _sum: { quantityM2: true },
      });
      for (const g of grouped) {
        stockByVariant.set(g.variantId, g._sum.quantityM2 ?? 0);
      }
    }

    const items = variants.map((v) => ({
      id: v.id,
      brandName: v.family.brand.name,
      familyName: v.family.name,
      size: v.size.toUpperCase(),
      surface: surfaceDisplayLabel(v.surface),
      quality: qualityLabel(v.quality),
      features: featureBadges(v).join(" "),
      code: v.code,
      stockM2: stockByVariant.get(v.id) ?? null,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/admin/stock/list failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Liste yüklenemedi" },
      { status: 500 }
    );
  }
}
