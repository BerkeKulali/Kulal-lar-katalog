import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import type { FilterBasis, FilterQuality } from "@/lib/campaign-filter";
import { normalizeSize } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { isPrismaSurface } from "@/lib/surface";

/** Kayıtlı ürün segmenti filtreleri listesi. Yetki: campaigns. */
export async function GET() {
  const auth = await requireAdminPermission("productFilter");
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
      minM2: p.minM2,
      maxM2: p.maxM2,
      sizes: JSON.parse(p.sizes) as string[],
      surfaces: JSON.parse(p.surfaces) as string[],
    })),
  });
}

/** Segmenti isimlendirip kaydet (örn. "Güral 250 m² altı ürünler"). Yetki: campaigns. */
export async function POST(request: Request) {
  const auth = await requireAdminPermission("productFilter");
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

  let minM2: number | null = null;
  if (body?.minM2 !== undefined && body?.minM2 !== null && body?.minM2 !== "") {
    minM2 = Number(body.minM2);
    if (!Number.isFinite(minM2) || minM2 < 0) {
      return NextResponse.json({ error: "Geçerli bir 'en az m²' değeri girin" }, { status: 400 });
    }
  }

  let maxM2: number | null = null;
  if (body?.maxM2 !== undefined && body?.maxM2 !== null && body?.maxM2 !== "") {
    maxM2 = Number(body.maxM2);
    if (!Number.isFinite(maxM2) || maxM2 < 0) {
      return NextResponse.json({ error: "Geçerli bir 'en çok m²' değeri girin" }, { status: 400 });
    }
  }

  if (minM2 != null && maxM2 != null && minM2 >= maxM2) {
    return NextResponse.json(
      { error: "'En az' değeri 'en çok' değerinden küçük olmalı" },
      { status: 400 }
    );
  }

  const sizes: string[] = Array.isArray(body?.sizes)
    ? body.sizes
        .filter((v: unknown): v is string => typeof v === "string")
        .map((s: string) => normalizeSize(s))
    : [];

  const surfacesInput: string[] = Array.isArray(body?.surfaces)
    ? body.surfaces.filter((v: unknown): v is string => typeof v === "string")
    : [];
  for (const s of surfacesInput) {
    if (!isPrismaSurface(s)) {
      return NextResponse.json({ error: `Geçersiz yüzey: ${s}` }, { status: 400 });
    }
  }
  const surfaces = surfacesInput.map((s) => s.toUpperCase());

  const preset = await prisma.productFilterPreset.create({
    data: {
      name,
      brandIds: JSON.stringify(brandIds),
      materialType,
      quality: quality ?? undefined,
      basis: basisRaw.toUpperCase() as "FAMILY" | "VARIANT",
      minM2,
      maxM2,
      sizes: JSON.stringify(sizes),
      surfaces: JSON.stringify(surfaces),
      createdByAdminId: auth.admin.id,
    },
  });

  return NextResponse.json({ preset }, { status: 201 });
}
