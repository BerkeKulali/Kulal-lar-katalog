import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import type { FilterBasis, FilterDirection, FilterQuality } from "@/lib/campaign-filter";
import { prisma } from "@/lib/prisma";

/** Kayıtlı ürün segmenti filtreleri listesi. Yetki: campaigns. */
export async function GET() {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

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
      direction: p.direction.toLowerCase() as FilterDirection,
      thresholdM2: p.thresholdM2,
    })),
  });
}

/** Segmenti isimlendirip kaydet (örn. "Güral 250 m² altı ürünler"). Yetki: campaigns. */
export async function POST(request: Request) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "İsim gerekli" }, { status: 400 });
  }

  const brandIds: string[] = Array.isArray(body?.brandIds)
    ? body.brandIds.filter((v: unknown): v is string => typeof v === "string")
    : [];
  const materialType = typeof body?.materialType === "string" ? body.materialType : null;

  const qualityRaw = String(body?.quality ?? "").toUpperCase();
  const quality: FilterQuality | null =
    qualityRaw === "FIRST" || qualityRaw === "END" ? (qualityRaw as FilterQuality) : null;

  const basisRaw = String(body?.basis ?? "").toLowerCase();
  if (basisRaw !== "family" && basisRaw !== "variant") {
    return NextResponse.json({ error: "Geçersiz basis" }, { status: 400 });
  }

  const directionRaw = String(body?.direction ?? "").toLowerCase();
  if (directionRaw !== "under" && directionRaw !== "over") {
    return NextResponse.json({ error: "Geçersiz direction" }, { status: 400 });
  }

  const thresholdM2 = Number(body?.thresholdM2);
  if (!Number.isFinite(thresholdM2) || thresholdM2 < 0) {
    return NextResponse.json({ error: "Geçerli bir m² eşiği girin" }, { status: 400 });
  }

  const preset = await prisma.productFilterPreset.create({
    data: {
      name,
      brandIds: JSON.stringify(brandIds),
      materialType,
      quality: quality ?? undefined,
      basis: basisRaw.toUpperCase() as "FAMILY" | "VARIANT",
      direction: directionRaw.toUpperCase() as "UNDER" | "OVER",
      thresholdM2,
      createdByAdminId: auth.admin.id,
    },
  });

  return NextResponse.json({ preset }, { status: 201 });
}
