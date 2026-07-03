import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  deductVariantStock,
  logOrderAction,
  orderBrandFilter,
} from "@/lib/order-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; lineId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const { id, lineId } = await context.params;
  const line = await prisma.orderLine.findFirst({
    where: {
      id: lineId,
      orderId: id,
      order: orderBrandFilter(auth.admin.brandId),
    },
    include: { variant: true },
  });

  if (!line) {
    return NextResponse.json({ error: "Satır bulunamadı" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const quantityM2 =
    body.quantityM2 !== undefined
      ? Number(body.quantityM2)
      : line.quantityM2;

  if (!Number.isFinite(quantityM2) || quantityM2 <= 0) {
    return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });
  }

  try {
    const updates = await prisma.$transaction(async (tx) => {
      const result = await deductVariantStock(tx, line.variantId, quantityM2);
      await logOrderAction(
        tx,
        id,
        auth.admin,
        "STOCK_DEDUCTED",
        `${line.productLabel}: ${result.map((u) => `${u.label} −${u.deducted} m²`).join(", ")}`
      );
      return result;
    });

    return NextResponse.json({ ok: true, updates });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stok düşülemedi";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
