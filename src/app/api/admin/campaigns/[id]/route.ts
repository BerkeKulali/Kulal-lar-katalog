import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import {
  CAMPAIGN_LOCATIONS,
  CAMPAIGN_QUALITY_TAGS,
  CAMPAIGN_SIZE_TAGS,
  parseCampaignTag,
} from "@/lib/campaign-tags";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/** Kampanya başlık/açıklama/durum güncelle. Yetki: campaigns. */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
  }

  const body = await request.json();
  const data: {
    title?: string;
    description?: string | null;
    isActive?: boolean;
    visibleToDealers?: boolean;
    sortOrder?: number;
    locationTag?: string | null;
    sizeTag?: string | null;
    qualityTag?: string | null;
  } = {};

  if (typeof body?.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Başlık boş olamaz" }, { status: 400 });
    }
    data.title = title;
  }
  if (typeof body?.description === "string" || body?.description === null) {
    data.description = body.description?.trim() || null;
  }
  if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body?.visibleToDealers === "boolean") {
    data.visibleToDealers = body.visibleToDealers;
  }
  if (typeof body?.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = body.sortOrder;
  }
  if ("locationTag" in body) {
    const parsed = parseCampaignTag(body.locationTag, CAMPAIGN_LOCATIONS);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Geçersiz lokasyon etiketi" }, { status: 400 });
    }
    data.locationTag = parsed.value;
  }
  if ("sizeTag" in body) {
    const parsed = parseCampaignTag(body.sizeTag, CAMPAIGN_SIZE_TAGS);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Geçersiz ebat etiketi" }, { status: 400 });
    }
    data.sizeTag = parsed.value;
  }
  if ("qualityTag" in body) {
    const parsed = parseCampaignTag(body.qualityTag, CAMPAIGN_QUALITY_TAGS);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Geçersiz kalite etiketi" }, { status: 400 });
    }
    data.qualityTag = parsed.value;
  }

  let campaign;
  try {
    campaign = await prisma.campaign.update({
      where: { id },
      data,
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
  } catch (e) {
    console.error("[admin/campaigns/[id] PATCH]", e);
    return NextResponse.json(
      { error: "Güncellenemedi (sunucu hatası)" },
      { status: 500 }
    );
  }

  await auditLog(
    { id: auth.admin.id, name: auth.admin.name },
    {
      action: "campaign.update",
      entityType: "campaign",
      entityId: campaign.id,
      summary: `Kampanya güncellendi: ${campaign.title}`,
    }
  );
  invalidateCatalogCache();

  return NextResponse.json({ campaign });
}

/** Kampanyayı (ve görsel kayıtlarını) sil. Yetki: campaigns. */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
  }

  await prisma.campaign.delete({ where: { id } });

  await auditLog(
    { id: auth.admin.id, name: auth.admin.name },
    {
      action: "campaign.delete",
      entityType: "campaign",
      entityId: id,
      summary: `Kampanya silindi: ${existing.title}`,
    }
  );
  invalidateCatalogCache();

  return NextResponse.json({ ok: true });
}
