import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import {
  normalizeColor,
  normalizeMaterialType,
} from "@/lib/product-attributes";
import { chunk } from "@/lib/utils";

const CHUNK = 100;

/** Renk & tip toplu düzenleme için aile listesi. Yetki: families. */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const brandId = searchParams.get("brandId")?.trim() || undefined;
  const onlyUnset = searchParams.get("onlyUnset") === "1";

  const families = await prisma.productFamily.findMany({
    where: {
      isActive: true,
      brandId: admin.brandId ?? brandId,
      ...(q ? { name: { contains: q } } : {}),
      ...(onlyUnset ? { OR: [{ color: null }, { materialType: null }] } : {}),
    },
    orderBy: [{ brand: { sortOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      color: true,
      materialType: true,
      brand: { select: { name: true } },
    },
    take: 1000,
  });

  return NextResponse.json({
    items: families.map((f) => ({
      id: f.id,
      name: f.name,
      brandName: f.brand.name,
      color: f.color,
      materialType: f.materialType,
    })),
  });
}

type SaveEntry = { familyId: string; color: string | null; materialType: string | null };

/** Toplu renk/tip kaydı (yalnızca geçerli önceden tanımlı değerler). */
export async function POST(request: Request) {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const body = await request.json().catch(() => null);
  const rawEntries = Array.isArray((body as { entries?: unknown })?.entries)
    ? ((body as { entries: unknown[] }).entries as unknown[])
    : null;
  if (!rawEntries) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const entries: SaveEntry[] = [];
  for (const raw of rawEntries) {
    const familyId =
      typeof (raw as { familyId?: unknown })?.familyId === "string"
        ? (raw as { familyId: string }).familyId
        : "";
    if (!familyId) continue;
    entries.push({
      familyId,
      color: normalizeColor((raw as { color?: string }).color),
      materialType: normalizeMaterialType(
        (raw as { materialType?: string }).materialType
      ),
    });
  }

  // Marka kapsamı: yalnızca yetkili olunan aileler.
  const ownedIds = new Set<string>();
  for (const idChunk of chunk(entries.map((e) => e.familyId), CHUNK)) {
    const owned = await prisma.productFamily.findMany({
      where: {
        id: { in: idChunk },
        ...(admin.brandId ? { brandId: admin.brandId } : {}),
      },
      select: { id: true },
    });
    for (const f of owned) ownedIds.add(f.id);
  }

  let saved = 0;
  for (const entry of entries) {
    if (!ownedIds.has(entry.familyId)) continue;
    await prisma.productFamily.update({
      where: { id: entry.familyId },
      data: { color: entry.color, materialType: entry.materialType },
    });
    saved += 1;
  }

  if (saved > 0) {
    invalidateCatalogCache();
    await auditLog(admin, {
      action: "family.attributes",
      entityType: "family",
      summary: `${saved} ürünün renk/tip bilgisi güncellendi`,
    });
  }

  return NextResponse.json({ saved });
}
