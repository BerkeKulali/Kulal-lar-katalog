import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  catalogFolder,
  initCloudinary,
  isCloudinaryConfigured,
  isPublicIdConflict,
  listCatalogImages,
  slugifyImageName,
  toImageItem,
} from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminPermission("images");
  if (!auth.admin) return auth.response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({
      configured: false,
      items: [],
      message: "Cloudinary env değişkenleri tanımlı değil.",
    });
  }

  const { searchParams } = new URL(request.url);
  const brandSlug = searchParams.get("brand") ?? undefined;
  const familySlug = searchParams.get("family") ?? undefined;
  const maxResults = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 48), 1),
    120
  );

  let prefix = "kulalilar-katalog";
  if (brandSlug) {
    prefix = catalogFolder(brandSlug, familySlug ?? undefined);
  }

  try {
    const resources = await listCatalogImages(prefix, {
      maxPages: 1,
      maxResults,
    });
    const items = resources.map((r) => toImageItem(r));
    return NextResponse.json({ configured: true, prefix, items });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Liste alınamadı" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission("images");
  if (!auth.admin) return auth.response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary yapılandırılmamış" },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const brandSlug = String(form.get("brandSlug") ?? "").trim();
  const familySlug = String(form.get("familySlug") ?? "").trim();

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  if (!brandSlug) {
    return NextResponse.json({ error: "Marka seçimi gerekli" }, { status: 400 });
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

  const clientName = file.name?.trim() || "upload";
  const slug = slugifyImageName(clientName);
  const folder = catalogFolder(brandSlug, familySlug || undefined);

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

    return NextResponse.json(toImageItem(uploaded));
  } catch (e) {
    const message =
      (e as { error?: { message?: string } })?.error?.message ??
      (e as Error)?.message ??
      "Cloudinary yükleme hatası";
    console.error("[admin/images POST]", message, e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
