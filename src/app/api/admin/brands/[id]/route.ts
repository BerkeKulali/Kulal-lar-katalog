import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("admins");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) {
    return NextResponse.json({ error: "Marka bulunamadı" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const { isVisible, visibleToDealers } = (body ?? {}) as {
    isVisible?: unknown;
    visibleToDealers?: unknown;
  };

  const data: { isVisible?: boolean; visibleToDealers?: boolean } = {};
  if (isVisible !== undefined) {
    if (typeof isVisible !== "boolean") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }
    data.isVisible = isVisible;
  }
  if (visibleToDealers !== undefined) {
    if (typeof visibleToDealers !== "boolean") {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }
    data.visibleToDealers = visibleToDealers;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Değişiklik yok" }, { status: 400 });
  }

  const updated = await prisma.brand.update({
    where: { id },
    data,
    select: { id: true, name: true, slug: true, isVisible: true, visibleToDealers: true },
  });

  // Marka görünürlüğü katalog SSR verisini etkiler; sonraki ziyarette taze
  // veri için önbelleği hemen geçersiz kıl.
  invalidateCatalogCache();

  const changes: string[] = [];
  if (data.isVisible !== undefined) {
    changes.push(`herkese görünürlük ${data.isVisible ? "açıldı" : "kapatıldı"}`);
  }
  if (data.visibleToDealers !== undefined) {
    changes.push(`bayilere görünürlük ${data.visibleToDealers ? "açıldı" : "kapatıldı"}`);
  }

  await auditLog(auth.admin, {
    action: "brands.visibility",
    entityType: "brand",
    entityId: updated.id,
    summary: `${updated.name}: ${changes.join(", ")}`,
  });

  return NextResponse.json({ brand: updated });
}
