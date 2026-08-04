import { NextResponse } from "next/server";
import { resolveFilterToolAccess } from "@/lib/filter-tool-access";
import type { FilterBasis } from "@/lib/campaign-filter";
import { prisma } from "@/lib/prisma";

/**
 * Kayıtlı ürün segmenti filtreleri listesi — plasiyer/onaylı bayi cihazları
 * için salt okunur (segment kaydetme/silme admin'de kalır).
 */
export async function GET() {
  const access = await resolveFilterToolAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const presets = await prisma.productFilterPreset.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    presets: presets.map((p) => ({
      id: p.id,
      name: p.name,
      brandIds: JSON.parse(p.brandIds) as string[],
      materialType: p.materialType,
      quality: p.quality,
      basis: p.basis.toLowerCase() as FilterBasis,
      minM2: p.minM2,
      maxM2: p.maxM2,
      sizes: JSON.parse(p.sizes) as string[],
      surfaces: JSON.parse(p.surfaces) as string[],
    })),
  });
}
