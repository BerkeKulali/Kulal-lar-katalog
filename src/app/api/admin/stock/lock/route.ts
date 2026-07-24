import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { chunk } from "@/lib/utils";

const CHUNK = 100;

/**
 * Seçili varyantların manuel stok kilidini açar/kapatır.
 * - locked=true  → Netsis otomasyonu bu varyantı atlar (manuel değer korunur).
 * - locked=false → kilit kaldırılır; sonraki Netsis senkronu stoğu günceller.
 * Miktarı değiştirmez.
 */
export async function POST(request: Request) {
  const auth = await requireAdminPermission("stock");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const body = await request.json().catch(() => null);
  const rawIds = (body as { variantIds?: unknown })?.variantIds;
  const locked = Boolean((body as { locked?: unknown })?.locked);

  const variantIds = Array.isArray(rawIds)
    ? [
        ...new Set(
          rawIds.filter(
            (x): x is string => typeof x === "string" && x.trim() !== ""
          )
        ),
      ]
    : [];

  if (variantIds.length === 0) {
    return NextResponse.json({ error: "Ürün seçilmedi" }, { status: 400 });
  }

  let updated = 0;
  for (const idChunk of chunk(variantIds, CHUNK)) {
    const res = await prisma.productVariant.updateMany({
      where: {
        id: { in: idChunk },
        isActive: true,
        ...(admin.brandId ? { family: { brandId: admin.brandId } } : {}),
      },
      data: { stockLocked: locked, stockLockedAt: locked ? new Date() : null },
    });
    updated += res.count;
  }

  if (updated > 0) {
    invalidateCatalogCache();
    await auditLog(admin, {
      action: "stock.lock",
      entityType: "stock",
      summary: `${updated} ürünün stok kilidi ${locked ? "açıldı (manuel)" : "kaldırıldı (otomasyona bırakıldı)"}`,
    });
  }

  return NextResponse.json({ updated, locked });
}
