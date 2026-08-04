import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/** Bayi cihazının stok görünürlüğünü ve/veya filtre aracı yetkisini aç/kapat. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    showStock?: unknown;
    filterToolEnabled?: unknown;
  } | null;

  const data: { showStock?: boolean; filterToolEnabled?: boolean } = {};
  if (typeof body?.showStock === "boolean") {
    data.showStock = body.showStock;
  }
  if (typeof body?.filterToolEnabled === "boolean") {
    data.filterToolEnabled = body.filterToolEnabled;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const dealer = await prisma.accessRequest.findFirst({
    where: { id, type: "DEALER" },
    select: { id: true, deviceId: true, dealerName: true },
  });

  if (!dealer) {
    return NextResponse.json({ error: "Bayi kaydı bulunamadı" }, { status: 404 });
  }
  if (!dealer.deviceId) {
    return NextResponse.json(
      { error: "Bu bayinin bağlı bir cihazı yok" },
      { status: 400 }
    );
  }

  const updated = await prisma.device.update({
    where: { id: dealer.deviceId },
    data,
    select: { showStock: true, filterToolEnabled: true },
  });

  return NextResponse.json({ ok: true, ...updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const request = await prisma.accessRequest.findFirst({
    where: { id, type: "DEALER" },
    select: {
      id: true,
      dealerName: true,
      requestLabel: true,
      deviceId: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Bayi kaydı bulunamadı" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (request.deviceId) {
      await tx.device.deleteMany({ where: { id: request.deviceId } });
    }
    await tx.accessRequest.delete({ where: { id: request.id } });
  });

  return NextResponse.json({
    ok: true,
    deleted: true,
    dealerName: request.dealerName ?? request.requestLabel,
  });
}
