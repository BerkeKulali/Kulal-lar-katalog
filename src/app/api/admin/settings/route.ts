import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

/** Genel ayarlar. Yetki: orders (satış/sipariş kontrolü). */
export async function GET() {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
    select: { salesEnabled: true },
  });

  return NextResponse.json({ salesEnabled: settings.salesEnabled });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminPermission("orders");
  if (!auth.admin) return auth.response;

  const body = await request.json().catch(() => null);
  const salesEnabled = (body as { salesEnabled?: unknown })?.salesEnabled;
  if (typeof salesEnabled !== "boolean") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: { salesEnabled },
    create: { id: "default", salesEnabled },
    select: { salesEnabled: true },
  });

  // Katalog SSR ve sonraki sync'lerin taze değeri alması için.
  invalidateCatalogCache();

  await auditLog(auth.admin, {
    action: "settings.sales",
    entityType: "settings",
    summary: `Satış ${salesEnabled ? "açıldı" : "kapatıldı"}`,
  });

  return NextResponse.json({ salesEnabled: settings.salesEnabled });
}
