import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/** Bayi cihazının stok görünürlüğünü aç/kapat. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const showStock = Boolean((body as { showStock?: unknown })?.showStock);

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

  await prisma.device.update({
    where: { id: dealer.deviceId },
    data: { showStock },
  });

  return NextResponse.json({ ok: true, showStock });
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
