import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  buildProductLabel,
  logOrderAction,
  orderBrandFilter,
} from "@/lib/order-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const order = await prisma.order.findFirst({
    where: { id, ...orderBrandFilter(auth.admin.brandId) },
  });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  if (order.status === "APPROVED") {
    return NextResponse.json(
      { error: "Onaylanmış siparişe ürün eklenemez" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const variantId = typeof body.variantId === "string" ? body.variantId : "";
  const quantityM2 = Number(body.quantityM2);
  const unitPrice = Number(body.unitPriceSnapshot ?? body.unitPrice);

  if (!variantId || !Number.isFinite(quantityM2) || quantityM2 <= 0) {
    return NextResponse.json(
      { error: "Variant ve geçerli miktar gerekli" },
      { status: 400 }
    );
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { family: { include: { brand: true } } },
  });

  if (!variant) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  if (auth.admin.brandId && variant.family.brandId !== auth.admin.brandId) {
    return NextResponse.json({ error: "Bu markaya erişiminiz yok" }, { status: 403 });
  }

  const price =
    Number.isFinite(unitPrice) && unitPrice > 0
      ? Math.round(unitPrice)
      : variant.price ?? 0;

  if (price <= 0) {
    return NextResponse.json({ error: "Geçerli fiyat gerekli" }, { status: 400 });
  }

  const label =
    typeof body.productLabel === "string" && body.productLabel.trim()
      ? body.productLabel.trim()
      : buildProductLabel(variant);

  const line = await prisma.$transaction(async (tx) => {
    const created = await tx.orderLine.create({
      data: {
        orderId: id,
        variantId,
        quantityM2,
        unitPriceSnapshot: price,
        productLabel: label,
      },
    });

    await logOrderAction(
      tx,
      id,
      auth.admin,
      "LINE_ADDED",
      `${label} · ${quantityM2} m² · ${price} + KDV`
    );

    if (order.status === "NEW") {
      await tx.order.update({
        where: { id },
        data: { status: "REVIEWED" },
      });
    }

    return created;
  });

  return NextResponse.json({ ok: true, line });
}
