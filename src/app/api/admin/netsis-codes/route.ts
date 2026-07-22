import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { surfaceDisplayLabel } from "@/lib/constants";
import { featureBadges } from "@/lib/product-features";
import { prisma } from "@/lib/prisma";
import { qualityLabel } from "@/lib/utils";
import { Prisma } from "@/generated/prisma/client";

/** Netsis kodu atama ekranı için varyant listesi. Yetki: stock. */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("stock");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const brandId = searchParams.get("brandId")?.trim() || undefined;
  const onlyUnset = searchParams.get("onlyUnset") === "1";

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      family: {
        isActive: true,
        // BRAND_MANAGER yalnızca kendi markasını görür/düzenler.
        brandId: admin.brandId ?? brandId,
      },
      ...(onlyUnset ? { netsisStockCode: null } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { netsisStockCode: { contains: q } },
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
      netsisStockCode: true,
      family: {
        select: { name: true, brand: { select: { name: true } } },
      },
    },
    take: 1000,
  });

  const items = variants.map((v) => {
    const badges = featureBadges(v);
    return {
      id: v.id,
      brandName: v.family.brand.name,
      familyName: v.family.name,
      size: v.size.toUpperCase(),
      surface: surfaceDisplayLabel(v.surface),
      quality: qualityLabel(v.quality),
      features: badges.join(" "),
      code: v.code,
      netsisStockCode: v.netsisStockCode,
    };
  });

  return NextResponse.json({ items });
}

type SaveEntry = { variantId: string; netsisStockCode: string | null };

/**
 * Toplu Netsis kodu kaydı. Boş/whitespace kod → null (atamayı kaldırır).
 * Benzersizlik çakışmaları satır bazında raporlanır; kalanlar yine de yazılır.
 */
export async function POST(request: Request) {
  const auth = await requireAdminPermission("stock");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const body = await request.json().catch(() => null);
  const rawEntries = Array.isArray((body as { entries?: unknown })?.entries)
    ? ((body as { entries: unknown[] }).entries as unknown[])
    : null;
  if (!rawEntries) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  // Normalize + istek içi çakışma kontrolü (aynı kod iki varyanta verilemez).
  const entries: SaveEntry[] = [];
  const seenCodes = new Map<string, string>();
  const conflicts: { variantId: string; code: string; reason: string }[] = [];

  for (const raw of rawEntries) {
    const variantId =
      typeof (raw as { variantId?: unknown })?.variantId === "string"
        ? (raw as { variantId: string }).variantId
        : "";
    if (!variantId) continue;

    const codeRaw = (raw as { netsisStockCode?: unknown })?.netsisStockCode;
    const code =
      typeof codeRaw === "string" && codeRaw.trim()
        ? codeRaw.trim().toUpperCase()
        : null;

    if (code) {
      const prev = seenCodes.get(code);
      if (prev && prev !== variantId) {
        conflicts.push({
          variantId,
          code,
          reason: "Aynı kod bu istekte birden fazla varyanta verildi",
        });
        continue;
      }
      seenCodes.set(code, variantId);
    }

    entries.push({ variantId, netsisStockCode: code });
  }

  // Marka kapsamı: yalnızca yetkili olunan varyantlar güncellenebilir.
  const ids = entries.map((e) => e.variantId);
  const owned = await prisma.productVariant.findMany({
    where: {
      id: { in: ids },
      ...(admin.brandId ? { family: { brandId: admin.brandId } } : {}),
    },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((v) => v.id));

  let saved = 0;
  for (const entry of entries) {
    if (!ownedIds.has(entry.variantId)) {
      conflicts.push({
        variantId: entry.variantId,
        code: entry.netsisStockCode ?? "",
        reason: "Bu varyanta erişim yetkiniz yok",
      });
      continue;
    }

    try {
      await prisma.productVariant.update({
        where: { id: entry.variantId },
        data: { netsisStockCode: entry.netsisStockCode },
      });
      saved++;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        conflicts.push({
          variantId: entry.variantId,
          code: entry.netsisStockCode ?? "",
          reason: "Bu Netsis kodu başka bir varyanta atanmış",
        });
        continue;
      }
      throw err;
    }
  }

  if (saved > 0) invalidateCatalogCache();

  return NextResponse.json({ saved, conflicts });
}
