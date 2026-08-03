import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Kampanya görsellerinin sırasını toplu günceller. Yetki: campaigns.
 * Body: { imageIds: string[] } — dizideki sıra yeni sortOrder'dır.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const { id: campaignId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const rawImageIds: unknown = body?.imageIds;
  const imageIds: string[] = Array.isArray(rawImageIds)
    ? rawImageIds.filter((v): v is string => typeof v === "string")
    : [];

  if (imageIds.length === 0) {
    return NextResponse.json({ error: "imageIds gerekli" }, { status: 400 });
  }

  const existing = await prisma.campaignImage.findMany({
    where: { campaignId, id: { in: imageIds } },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((e) => e.id));
  const validIds = imageIds.filter((id) => existingIds.has(id));

  await prisma.$transaction(
    validIds.map((id, index) =>
      prisma.campaignImage.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  invalidateCatalogCache();
  return NextResponse.json({ ok: true, updated: validIds.length });
}
