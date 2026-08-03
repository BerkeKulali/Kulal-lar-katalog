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

/** Kampanya listesi (görsel dahil). Yetki: campaigns. */
export async function GET() {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const campaigns = await prisma.campaign.findMany({
    include: { images: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ campaigns });
}

/** Yeni kampanya oluştur. Yetki: campaigns. */
export async function POST(request: Request) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const body = await request.json();
  const title = String(body?.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }

  const description = String(body?.description ?? "").trim() || null;
  const visibleToDealers = body?.visibleToDealers !== false;
  const isActive = body?.isActive !== false;

  const location = parseCampaignTag(body?.locationTag, CAMPAIGN_LOCATIONS);
  const size = parseCampaignTag(body?.sizeTag, CAMPAIGN_SIZE_TAGS);
  const quality = parseCampaignTag(body?.qualityTag, CAMPAIGN_QUALITY_TAGS);
  if (!location.ok || !size.ok || !quality.ok) {
    return NextResponse.json({ error: "Geçersiz etiket değeri" }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({
    data: {
      title,
      description,
      visibleToDealers,
      isActive,
      locationTag: location.value,
      sizeTag: size.value,
      qualityTag: quality.value,
    },
    include: { images: true },
  });

  await auditLog(
    { id: auth.admin.id, name: auth.admin.name },
    {
      action: "campaign.create",
      entityType: "campaign",
      entityId: campaign.id,
      summary: `Kampanya oluşturuldu: ${title}`,
    }
  );
  invalidateCatalogCache();

  return NextResponse.json({ campaign }, { status: 201 });
}
