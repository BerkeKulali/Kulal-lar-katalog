import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { surfaceDisplayLabel } from "@/lib/constants";
import { featureBadges } from "@/lib/product-features";
import { prisma } from "@/lib/prisma";
import { chunk, qualityLabel } from "@/lib/utils";
import { Prisma } from "@/generated/prisma/client";

/** Turso parametre limitini aşmamak için IN sorguları bu boyutta parçalanır. */
const CODE_QUERY_CHUNK = 100;

/** Netsis kodu atama ekranı için varyant listesi. Yetki: stock. */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("netsis");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const brandId = searchParams.get("brandId")?.trim() || undefined;
  const onlyUnset = searchParams.get("onlyUnset") === "1";

  try {
    return await listVariants({ adminBrandId: admin.brandId, brandId, q, onlyUnset });
  } catch (err) {
    console.error("GET /api/admin/netsis-codes failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Liste yüklenemedi" },
      { status: 500 }
    );
  }
}

async function listVariants(opts: {
  adminBrandId: string | null;
  brandId: string | undefined;
  q: string;
  onlyUnset: boolean;
}) {
  const { adminBrandId, brandId, q, onlyUnset } = opts;

  const variants = await prisma.productVariant.findMany({
    where: {
      isActive: true,
      family: {
        isActive: true,
        // BRAND_MANAGER yalnızca kendi markasını görür/düzenler.
        brandId: adminBrandId ?? brandId,
      },
      ...(onlyUnset ? { netsisCodes: { none: {} } } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q } },
              { netsisCodes: { some: { code: { contains: q.toUpperCase() } } } },
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

  // Netsis kodları ayrı ve parçalı çekilir: ilişkinin tek sorguda yüklenmesi
  // Turso'nun parametre (IN listesi) limitini aşıyordu.
  const codesByVariant = new Map<string, string[]>();
  for (const idChunk of chunk(variants.map((v) => v.id), CODE_QUERY_CHUNK)) {
    const rows = await prisma.variantNetsisCode.findMany({
      where: { variantId: { in: idChunk } },
      select: { variantId: true, code: true },
      orderBy: { code: "asc" },
    });
    for (const r of rows) {
      const list = codesByVariant.get(r.variantId) ?? [];
      list.push(r.code);
      codesByVariant.set(r.variantId, list);
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
    codes: codesByVariant.get(v.id) ?? [],
  }));

  return NextResponse.json({ items });
}

type SaveEntry = { variantId: string; codes: string[] };

/**
 * Toplu Netsis kodu kaydı. Her varyant için kod KÜMESİ yeniden yazılır
 * (gönderilen liste neyse o kalır; boş liste tüm kodları kaldırır).
 * Benzersizlik çakışmaları satır bazında raporlanır.
 */
export async function POST(request: Request) {
  const auth = await requireAdminPermission("netsis");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const body = await request.json().catch(() => null);
  const rawEntries = Array.isArray((body as { entries?: unknown })?.entries)
    ? ((body as { entries: unknown[] }).entries as unknown[])
    : null;
  if (!rawEntries) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const conflicts: { variantId: string; code: string; reason: string }[] = [];

  // Normalize + istek içi çakışma kontrolü (aynı kod iki varyanta verilemez).
  const entries: SaveEntry[] = [];
  const codeOwner = new Map<string, string>();
  for (const raw of rawEntries) {
    const variantId =
      typeof (raw as { variantId?: unknown })?.variantId === "string"
        ? (raw as { variantId: string }).variantId
        : "";
    if (!variantId) continue;

    const rawCodes = (raw as { codes?: unknown })?.codes;
    const codes: string[] = [];
    const seen = new Set<string>();
    if (Array.isArray(rawCodes)) {
      for (const c of rawCodes) {
        const code = typeof c === "string" ? c.trim().toUpperCase() : "";
        if (!code || seen.has(code)) continue;
        seen.add(code);

        const owner = codeOwner.get(code);
        if (owner && owner !== variantId) {
          conflicts.push({
            variantId,
            code,
            reason: "Aynı kod bu istekte birden fazla varyanta verildi",
          });
          continue;
        }
        codeOwner.set(code, variantId);
        codes.push(code);
      }
    }
    entries.push({ variantId, codes });
  }

  // Marka kapsamı: yalnızca yetkili olunan varyantlar güncellenebilir.
  const ownedIds = new Set<string>();
  for (const idChunk of chunk(entries.map((e) => e.variantId), CODE_QUERY_CHUNK)) {
    const owned = await prisma.productVariant.findMany({
      where: {
        id: { in: idChunk },
        ...(admin.brandId ? { family: { brandId: admin.brandId } } : {}),
      },
      select: { id: true },
    });
    for (const v of owned) ownedIds.add(v.id);
  }

  let saved = 0;
  for (const entry of entries) {
    if (!ownedIds.has(entry.variantId)) {
      conflicts.push({
        variantId: entry.variantId,
        code: entry.codes.join(", "),
        reason: "Bu varyanta erişim yetkiniz yok",
      });
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Başka varyantlara ait kodları çakışma olarak ayıkla; kalanları yaz.
        const clashes = await tx.variantNetsisCode.findMany({
          where: {
            code: { in: entry.codes },
            variantId: { not: entry.variantId },
          },
          select: { code: true },
        });
        const blocked = new Set(clashes.map((c) => c.code));
        for (const code of entry.codes) {
          if (blocked.has(code)) {
            conflicts.push({
              variantId: entry.variantId,
              code,
              reason: "Bu Netsis kodu başka bir varyanta atanmış",
            });
          }
        }
        const finalCodes = entry.codes.filter((c) => !blocked.has(c));

        // Kod kümesini yeniden yaz.
        await tx.variantNetsisCode.deleteMany({
          where: { variantId: entry.variantId },
        });
        if (finalCodes.length > 0) {
          await tx.variantNetsisCode.createMany({
            data: finalCodes.map((code) => ({
              code,
              variantId: entry.variantId,
            })),
          });
        }
      });
      saved++;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        conflicts.push({
          variantId: entry.variantId,
          code: entry.codes.join(", "),
          reason: "Netsis kodu çakışması",
        });
        continue;
      }
      throw err;
    }
  }

  if (saved > 0) invalidateCatalogCache();

  return NextResponse.json({ saved, conflicts });
}
