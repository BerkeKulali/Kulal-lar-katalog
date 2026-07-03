import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  CATALOG_IMAGE_ROOT,
  isCloudinaryConfigured,
  pingCloudinary,
} from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminPermission("images");
  if (!auth.admin) return auth.response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message:
        ".env dosyasına CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ve CLOUDINARY_API_SECRET ekleyin.",
    });
  }

  try {
    await pingCloudinary();
    return NextResponse.json({
      ok: true,
      configured: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: CATALOG_IMAGE_ROOT,
      message: "Cloudinary bağlantısı başarılı.",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      configured: true,
      message: (e as Error).message ?? "Bağlantı hatası",
    });
  }
}
