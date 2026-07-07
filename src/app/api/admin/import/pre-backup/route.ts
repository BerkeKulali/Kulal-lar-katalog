import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { uploadBackupToCloudinary } from "@/lib/db-backup-cloud";
import { exportDatabaseManifest } from "@/lib/db-backup";

export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireAdminPermission("import");
  if (!auth.admin) return auth.response;

  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "import")
    .trim()
    .replace(/[^a-z0-9-_]/gi, "-")
    .slice(0, 40);

  const label = `pre-${reason || "import"}`;
  const manifest = await exportDatabaseManifest(label);

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          "Yedekleme için Cloudinary yapılandırılmamış. İçe aktarmadan önce yedek alınamaz.",
        summary: manifest.summary,
      },
      { status: 503 }
    );
  }

  const uploaded = await uploadBackupToCloudinary(manifest, label);

  return NextResponse.json({
    ok: true,
    summary: manifest.summary,
    backup: uploaded,
  });
}
