import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  deductVariantStock,
  logOrderAction,
  orderBrandFilter,
} from "@/lib/order-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string; lineId: string }> };

async function loadLine(orderId: string, lineId: string, adminBrandId: string | null) {
  return prisma.orderLine.findFirst({
    where: {
      id: lineId,
      orderId,
      order: orderBrandFilter(adminBrandId),
    },
    include: { order: true, variant: { include: { family: true } } },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const { id, lineId } = await context.params;
  const line = await loadLine(id, lineId, auth.admin.brandId);
  if (!line) {
    return NextResponse.json({ error: "Satır bulunamadı" }, { status: 404 });
  }

  if (line.order.status === "APPROVED") {
    return NextResponse.json(
      { error: "Onaylanmış sipariş satırı düzenlenemez" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const data: { quantityM2?: number; unitPriceSnapshot?: number } = {};
  const changes: string[] = [];

  if (body.quantityM2 !== undefined) {
    const q = Number(body.quantityM2);
    if (!Number.isFinite(q) || q <= 0) {
      return NextResponse.json({ error: "Geçersiz miktar" }, { status: 400 });
    }
    if (q !== line.quantityM2) {
      changes.push(`Miktar: ${line.quantityM2} → ${q} m²`);
      data.quantityM2 = q;
    }
  }

  if (body.unitPriceSnapshot !== undefined || body.unitPrice !== undefined) {
    const p = Number(body.unitPriceSnapshot ?? body.unitPrice);
    if (!Number.isFinite(p) || p <= 0) {
      return NextResponse.json({ error: "Geçersiz fiyat" }, { status: 400 });
    }
    if (p !== line.unitPriceSnapshot) {
      changes.push(`Fiyat: ${line.unitPriceSnapshot} → ${p} + KDV`);
      data.unitPriceSnapshot = Math.round(p);
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderLine.update({ where: { id: lineId }, data });
    await logOrderAction(
      tx,
      id,
      auth.admin,
      "LINE_UPDATED",
      `${line.productLabel} · ${changes.join(" · ")}`
    );
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const { id, lineId } = await context.params;
  const line = await loadLine(id, lineId, auth.admin.brandId);
  if (!line) {
    return NextResponse.json({ error: "Satır bulunamadı" }, { status: 404 });
  }

  if (line.order.status === "APPROVED") {
    return NextResponse.json(
      { error: "Onaylanmış siparişten satır silinemez" },
      { status: 409 }
    );
  }

  const lineCount = await prisma.orderLine.count({ where: { orderId: id } });
  if (lineCount <= 1) {
    return NextResponse.json(
      { error: "Son satır silinemez — siparişi silin" },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await logOrderAction(
      tx,
      id,
      auth.admin,
      "LINE_REMOVED",
      `${line.productLabel} · ${line.quantityM2} m²`
    );
    await tx.orderLine.delete({ where: { id: lineId } });
  });

  return NextResponse.json({ ok: true });
}
