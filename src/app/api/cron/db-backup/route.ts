import { NextResponse } from "next/server";
import { uploadBackupToCloudinary } from "@/lib/db-backup-cloud";
import { exportDatabaseManifest } from "@/lib/db-backup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET tanimli degil" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const manifest = await exportDatabaseManifest("cron-daily");
    const uploaded = await uploadBackupToCloudinary(manifest, "cron-daily");

    return NextResponse.json({
      ok: true,
      summary: manifest.summary,
      backup: uploaded,
    });
  } catch (err) {
    console.error("cron db-backup failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Yedek basarisiz" },
      { status: 500 }
    );
  }
}
