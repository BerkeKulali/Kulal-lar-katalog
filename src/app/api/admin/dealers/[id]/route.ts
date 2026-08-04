import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { approveDealer, rejectDealer } from "@/lib/dealer-account";
import { invalidateDealerCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Bekleyen bayi hesabını onayla/reddet (action) ve/veya onaylı bir bayinin
 * stok/filtre/aktiflik ayarlarını güncelle. `id` önce Dealer (kullanıcı
 * adı/şifre hesabı) olarak denenir; bulunamazsa eski (anında kayıt
 * döneminden kalma, hiçbir Dealer'a bağlı olmayan) tek cihazlık bayi
 * kaydı olarak denenir — geriye dönük uyumluluk için.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    reason?: unknown;
    showStock?: unknown;
    filterToolEnabled?: unknown;
    isActive?: unknown;
  } | null;

  const action = typeof body?.action === "string" ? body.action.trim().toLowerCase() : "";

  if (action === "approve" || action === "reject") {
    try {
      if (action === "approve") {
        await approveDealer(id, auth.admin.id);
        invalidateDealerCache();
        return NextResponse.json({ ok: true, status: "APPROVED" });
      }
      const reason = typeof body?.reason === "string" ? body.reason : undefined;
      await rejectDealer(id, auth.admin.id, reason);
      invalidateDealerCache();
      return NextResponse.json({ ok: true, status: "REJECTED" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Talep güncellenemedi";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const data: { showStock?: boolean; filterToolEnabled?: boolean; isActive?: boolean } = {};
  if (typeof body?.showStock === "boolean") data.showStock = body.showStock;
  if (typeof body?.filterToolEnabled === "boolean") data.filterToolEnabled = body.filterToolEnabled;
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const dealer = await prisma.dealer.findUnique({ where: { id }, select: { id: true } });
  if (dealer) {
    const updated = await prisma.dealer.update({
      where: { id },
      data,
      select: { showStock: true, filterToolEnabled: true, isActive: true },
    });
    invalidateDealerCache();
    return NextResponse.json({ ok: true, ...updated });
  }

  const legacyDevice = await prisma.device.findFirst({
    where: { id, salespersonId: null, dealerId: null },
    select: { id: true },
  });
  if (!legacyDevice) {
    return NextResponse.json({ error: "Bayi kaydı bulunamadı" }, { status: 404 });
  }

  const updated = await prisma.device.update({
    where: { id: legacyDevice.id },
    data: { showStock: data.showStock, filterToolEnabled: data.filterToolEnabled },
    select: { showStock: true, filterToolEnabled: true },
  });

  return NextResponse.json({ ok: true, ...updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;

  const dealer = await prisma.dealer.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (dealer) {
    await prisma.$transaction([
      prisma.device.deleteMany({ where: { dealerId: id } }),
      prisma.dealer.delete({ where: { id } }),
    ]);
    invalidateDealerCache();
    return NextResponse.json({ ok: true, deleted: true, dealerName: dealer.name });
  }

  const legacyDevice = await prisma.device.findFirst({
    where: { id, salespersonId: null, dealerId: null },
    select: { id: true, label: true },
  });
  if (!legacyDevice) {
    return NextResponse.json({ error: "Bayi kaydı bulunamadı" }, { status: 404 });
  }

  await prisma.device.delete({ where: { id: legacyDevice.id } });

  return NextResponse.json({
    ok: true,
    deleted: true,
    dealerName: legacyDevice.label ?? "Bayi cihazı",
  });
}
