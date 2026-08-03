import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { auditLog } from "@/lib/audit";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import {
  CATALOG_IMAGE_ROOT,
  initCloudinary,
  isCloudinaryConfigured,
  isPublicIdConflict,
  slugifyImageName,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function campaignFolder(campaignId: string) {
  return `${CATALOG_IMAGE_ROOT}/kampanyalar/${campaignId}`;
}

/** Kampanyaya görsel yükle (Cloudinary + CampaignImage kaydı). Yetki: campaigns. */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const { id: campaignId } = await context.params;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, images: { select: { sortOrder: true } } },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Kampanya bulunamadı" }, { status: 404 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary yapılandırılmamış" },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "Dosya çok büyük (max 12MB)" },
      { status: 413 }
    );
  }

  const cld = initCloudinary();
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mime = file.type || "application/octet-stream";
  const dataUri = `data:${mime};base64,${base64}`;

  const clientName = file.name?.trim() || "afis-sayfasi";
  const slug = slugifyImageName(clientName);
  const folder = campaignFolder(campaignId);

  try {
    let uploaded = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      const idPart = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
      const publicId = `${folder}/${idPart}`;
      try {
        uploaded = await cld.uploader.upload(dataUri, {
          public_id: publicId,
          resource_type: "image",
          overwrite: false,
          filename_override: clientName,
          use_filename: false,
          unique_filename: false,
        });
        break;
      } catch (err) {
        if (isPublicIdConflict(err) && attempt < 24) continue;
        throw err;
      }
    }

    if (!uploaded) {
      return NextResponse.json({ error: "Yükleme başarısız" }, { status: 500 });
    }

    const maxSortOrder = campaign.images.reduce(
      (max, img) => Math.max(max, img.sortOrder),
      -1
    );

    const image = await prisma.campaignImage.create({
      data: {
        campaignId,
        imageUrl: uploaded.secure_url ?? uploaded.url,
        imagePublicId: uploaded.public_id,
        sortOrder: maxSortOrder + 1,
      },
    });

    invalidateCatalogCache();
    return NextResponse.json({ image }, { status: 201 });
  } catch (e) {
    const message =
      (e as { error?: { message?: string } })?.error?.message ??
      (e as Error)?.message ??
      "Cloudinary yükleme hatası";
    console.error("[admin/campaigns/[id]/images POST]", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Kampanya görselini sil (DB + Cloudinary). Yetki: campaigns. Body: { imageId } */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("campaigns");
  if (!auth.admin) return auth.response;

  const { id: campaignId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const imageId = String(body?.imageId ?? "").trim();
  if (!imageId) {
    return NextResponse.json({ error: "imageId gerekli" }, { status: 400 });
  }

  const image = await prisma.campaignImage.findUnique({
    where: { id: imageId },
  });
  if (!image || image.campaignId !== campaignId) {
    return NextResponse.json({ error: "Görsel bulunamadı" }, { status: 404 });
  }

  if (image.imagePublicId && isCloudinaryConfigured()) {
    try {
      const cld = initCloudinary();
      await cld.uploader.destroy(image.imagePublicId, { resource_type: "image" });
    } catch (err) {
      // Cloudinary silme hatası kaydı engellemesin — DB kaydı yine de temizlenir.
      console.error("[admin/campaigns/[id]/images DELETE] Cloudinary destroy hatası:", err);
    }
  }

  await prisma.campaignImage.delete({ where: { id: imageId } });

  await auditLog(
    { id: auth.admin.id, name: auth.admin.name },
    {
      action: "campaign.image.delete",
      entityType: "campaign",
      entityId: campaignId,
      summary: "Kampanya görseli silindi",
    }
  );
  invalidateCatalogCache();

  return NextResponse.json({ ok: true });
}
