import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  listCloudBackups,
  uploadBackupToCloudinary,
} from "@/lib/db-backup-cloud";
import {
  exportDatabaseManifest,
  manifestFilename,
} from "@/lib/db-backup";

export const dynamic = "force-dynamic";

function requireSuperAdmin(admin: Awaited<ReturnType<typeof requireAdmin>>) {
  if (!admin || admin.role !== "SUPER") {
    return NextResponse.json({ error: "Sadece süper admin" }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  const denied = requireSuperAdmin(admin);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");

  if (mode === "history") {
    const backups = await listCloudBackups(15);
    return NextResponse.json({ backups });
  }

  const manifest = await exportDatabaseManifest("admin-download");
  const filename = manifestFilename("admin-download");

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function POST() {
  const admin = await requireAdmin();
  const denied = requireSuperAdmin(admin);
  if (denied) return denied;

  const manifest = await exportDatabaseManifest("admin-cloud");
  const uploaded = await uploadBackupToCloudinary(manifest, "admin-cloud");

  return NextResponse.json({
    ok: true,
    summary: manifest.summary,
    backup: uploaded,
  });
}
