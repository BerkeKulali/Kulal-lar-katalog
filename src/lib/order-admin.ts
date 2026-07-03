import type { OrderStatus } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Yeni",
  CORRECTION_REQUESTED: "Düzeltme istendi",
  REVIEWED: "İncelendi",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
};

export const ORDER_ACTION_LABELS: Record<string, string> = {
  ORDER_APPROVED: "Sipariş onaylandı",
  CORRECTION_REQUESTED: "Düzeltme istendi",
  ORDER_REJECTED: "Sipariş reddedildi",
  ORDER_DELETED: "Sipariş silindi",
  LINE_ADDED: "Ürün eklendi",
  LINE_UPDATED: "Satır güncellendi",
  LINE_REMOVED: "Satır silindi",
  STOCK_DEDUCTED: "Stok düşüldü",
  ORDER_META_UPDATED: "Sipariş bilgisi güncellendi",
};

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export async function logOrderAction(
  tx: Tx,
  orderId: string,
  admin: { id: string; name: string },
  action: string,
  message?: string | null
) {
  return tx.orderAdminLog.create({
    data: {
      orderId,
      adminUserId: admin.id,
      adminName: admin.name,
      action,
      message: message ?? null,
    },
  });
}

export function orderBrandFilter(brandId: string | null | undefined) {
  if (!brandId) return undefined;
  return {
    lines: {
      some: { variant: { family: { brandId } } },
    },
  };
}

export async function deductVariantStock(
  tx: Tx,
  variantId: string,
  quantityM2: number
) {
  const lines = await tx.stockLine.findMany({
    where: { variantId, quantityM2: { gt: 0 } },
    orderBy: { quantityM2: "desc" },
  });

  let remaining = quantityM2;
  const updates: { label: string; deducted: number }[] = [];

  for (const line of lines) {
    if (remaining <= 0) break;
    const deduct = Math.min(line.quantityM2, remaining);
    await tx.stockLine.update({
      where: { id: line.id },
      data: { quantityM2: Math.round((line.quantityM2 - deduct) * 1000) / 1000 },
    });
    updates.push({ label: line.label, deducted: deduct });
    remaining = Math.round((remaining - deduct) * 1000) / 1000;
  }

  if (remaining > 0.001) {
    throw new Error(`Yetersiz stok (${remaining.toFixed(1)} m² eksik)`);
  }

  return updates;
}

export function buildProductLabel(variant: {
  family: { name: string };
  size: string;
  surface: string;
  quality: string;
}) {
  const q = variant.quality === "FIRST" ? "1." : "END";
  return `${variant.family.name} ${variant.size.toUpperCase()} ${variant.surface} ${q}`;
}
