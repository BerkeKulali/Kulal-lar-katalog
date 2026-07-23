import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { chunk } from "@/lib/utils";

/** Manuel sabitlenen stok satırının etiketi. */
const MANUAL_STOCK_LABEL = "Manuel";
const CHUNK = 100;
const MAX_QUANTITY_M2 = 1_000_000;

/**
 * Seçili varyantların stoğunu tek bir manuel değere sabitler.
 * Her varyantın mevcut stok satırları silinip yerine tek satır yazılır
 * (miktar 0 olabilir → "stok yok" olarak sabitlenir).
 * Eşleşme yalnızca yetkili olunan (marka kapsamı) varyantlarda yapılır.
 */
export async function POST(request: Request) {
  const auth = await requireAdminPermission("stock");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const body = await request.json().catch(() => null);
  const rawIds = (body as { variantIds?: unknown })?.variantIds;
  const quantity = Number((body as { quantityM2?: unknown })?.quantityM2);

  const variantIds = Array.isArray(rawIds)
    ? [...new Set(rawIds.filter((x): x is string => typeof x === "string" && x.trim() !== ""))]
    : [];

  if (variantIds.length === 0) {
    return NextResponse.json({ error: "Ürün seçilmedi" }, { status: 400 });
  }
  if (!Number.isFinite(quantity)) {
    return NextResponse.json(
      { error: "Geçerli bir stok miktarı girin" },
      { status: 400 }
    );
  }
  // Negatif stok (fazla satış) kabul edilir; yalnızca aşırı büyüklüğü sınırla.
  if (Math.abs(quantity) > MAX_QUANTITY_M2) {
    return NextResponse.json({ error: "Miktar çok büyük" }, { status: 400 });
  }

  const quantityM2 = Math.round(quantity * 100) / 100;

  // Marka kapsamı: yalnızca yetkili olunan varyantlar (parçalı sorgu).
  const ownedIds: string[] = [];
  for (const idChunk of chunk(variantIds, CHUNK)) {
    const owned = await prisma.productVariant.findMany({
      where: {
        id: { in: idChunk },
        isActive: true,
        ...(admin.brandId ? { family: { brandId: admin.brandId } } : {}),
      },
      select: { id: true },
    });
    for (const v of owned) ownedIds.push(v.id);
  }

  let updated = 0;
  for (const variantId of ownedIds) {
    await prisma.$transaction(async (tx) => {
      await tx.stockLine.deleteMany({ where: { variantId } });
      await tx.stockLine.create({
        data: { variantId, label: MANUAL_STOCK_LABEL, quantityM2 },
      });
      await tx.productVariant.update({
        where: { id: variantId },
        data: { updatedAt: new Date() },
      });
    });
    updated++;
  }

  if (updated > 0) {
    invalidateCatalogCache();
    await auditLog(admin, {
      action: "stock.manual",
      entityType: "stock",
      summary: `${updated} ürünün stoğu ${quantityM2} m² olarak sabitlendi`,
    });
  }

  return NextResponse.json({ updated, skipped: variantIds.length - updated });
}
