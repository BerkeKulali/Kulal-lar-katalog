import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { uploadBackupToCloudinary } from "@/lib/db-backup-cloud";
import { exportDatabaseManifest } from "@/lib/db-backup";
import { checkRateLimitShared } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** İki string'i sabit sürede karşılaştırır (token sızıntısını/zamanlama saldırısını önlemek için). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET tanimli degil" },
      { status: 503 }
    );
  }

  // Yanlis/kaba-kuvvet denemelerini yavaslat (Vercel cron gunde bir kez
  // cagirir, bu yuzden dusuk bir limit yeterli - bkz. netsis-ingest route'u
  // ile ayni desen).
  const rl = await checkRateLimitShared("cron-db-backup", {
    max: 5,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Cok fazla istek", retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 }
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!safeEqual(auth, expected)) {
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
