import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  deductVariantStock,
  logOrderAction,
  orderBrandFilter,
} from "@/lib/order-admin";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOrder(id: string, adminBrandId: string | null) {
  const order = await prisma.order.findFirst({
    where: { id, ...orderBrandFilter(adminBrandId) },
    include: {
      salesperson: true,
      approvedByAdmin: { select: { id: true, name: true } },
      lines: {
        orderBy: { id: "asc" },
        include: {
          variant: {
            include: {
              family: { include: { brand: { select: { id: true, name: true } } } },
              stockLines: { orderBy: { quantityM2: "desc" } },
            },
          },
        },
      },
      adminLogs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return order;
}

function serializeOrder(order: NonNullable<Awaited<ReturnType<typeof loadOrder>>>) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    dealerName: order.dealerName,
    notes: order.notes,
    correctionNote: order.correctionNote,
    status: order.status,
    approvedByAdminId: order.approvedByAdminId,
    approvedByAdminName: order.approvedByAdmin?.name ?? null,
    approvedAt: order.approvedAt,
    createdAt: order.createdAt,
    salesperson: order.salesperson,
    lines: order.lines.map((line) => ({
      id: line.id,
      variantId: line.variantId,
      productLabel: line.productLabel,
      quantityM2: line.quantityM2,
      unitPriceSnapshot: line.unitPriceSnapshot,
      brandName: line.variant.family.brand.name,
      stockTotal: line.variant.stockLines.reduce((s, l) => s + l.quantityM2, 0),
      stockLines: line.variant.stockLines.map((s) => ({
        id: s.id,
        label: s.label,
        quantityM2: s.quantityM2,
      })),
    })),
    logs: order.adminLogs.map((log) => ({
      id: log.id,
      adminUserId: log.adminUserId,
      adminName: log.adminName,
      action: log.action,
      message: log.message,
      createdAt: log.createdAt,
    })),
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const order = await loadOrder(id, auth.admin.brandId);
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  return NextResponse.json({ order: serializeOrder(order) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const existing = await loadOrder(id, auth.admin.brandId);
  if (!existing) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action as string | undefined;

  try {
    if (action === "approve") {
      const deductStock = Boolean(body.deductStock);
      await prisma.$transaction(async (tx) => {
        if (deductStock) {
          for (const line of existing.lines) {
            const updates = await deductVariantStock(
              tx,
              line.variantId,
              line.quantityM2
            );
            await logOrderAction(
              tx,
              id,
              auth.admin,
              "STOCK_DEDUCTED",
              `${line.productLabel}: ${updates.map((u) => `${u.label} −${u.deducted} m²`).join(", ")}`
            );
          }
        }

        await tx.order.update({
          where: { id },
          data: {
            status: "APPROVED",
            approvedByAdminId: auth.admin.id,
            approvedAt: new Date(),
            correctionNote: null,
          },
        });

        await logOrderAction(tx, id, auth.admin, "ORDER_APPROVED");
      });
    } else if (action === "request_correction") {
      const note =
        typeof body.correctionNote === "string"
          ? body.correctionNote.trim()
          : "";
      if (!note) {
        return NextResponse.json(
          { error: "Düzeltme notu gerekli" },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: {
            status: "CORRECTION_REQUESTED",
            correctionNote: note,
            approvedByAdminId: null,
            approvedAt: null,
          },
        });
        await logOrderAction(tx, id, auth.admin, "CORRECTION_REQUESTED", note);
      });
    } else if (action === "reject") {
      const message =
        typeof body.message === "string" ? body.message.trim() : null;
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: {
            status: "REJECTED",
            approvedByAdminId: null,
            approvedAt: null,
          },
        });
        await logOrderAction(
          tx,
          id,
          auth.admin,
          "ORDER_REJECTED",
          message ?? undefined
        );
      });
    } else if (action === "update_meta") {
      const dealerName =
        typeof body.dealerName === "string" ? body.dealerName.trim() : undefined;
      const notes =
        body.notes === null || typeof body.notes === "string"
          ? body.notes?.trim() || null
          : undefined;

      const changes: string[] = [];
      if (dealerName && dealerName !== existing.dealerName) {
        changes.push(`Bayi: ${existing.dealerName} → ${dealerName}`);
      }
      if (notes !== undefined && notes !== existing.notes) {
        changes.push("Not güncellendi");
      }

      if (!dealerName && notes === undefined) {
        return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: {
            ...(dealerName ? { dealerName } : {}),
            ...(notes !== undefined ? { notes } : {}),
          },
        });
        await logOrderAction(
          tx,
          id,
          auth.admin,
          "ORDER_META_UPDATED",
          changes.join(" · ") || undefined
        );
      });
    } else {
      return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
    }

    const order = await loadOrder(id, auth.admin.brandId);
    return NextResponse.json({ ok: true, order: order ? serializeOrder(order) : null });
  } catch (err) {
    console.error("PATCH /api/admin/orders/[id] failed:", err);
    const message = err instanceof Error ? err.message : "İşlem başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const existing = await loadOrder(id, auth.admin.brandId);
  if (!existing) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await logOrderAction(
      tx,
      id,
      auth.admin,
      "ORDER_DELETED",
      `Sipariş no: ${existing.orderNumber}`
    );
    await tx.order.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true, deleted: true });
}
