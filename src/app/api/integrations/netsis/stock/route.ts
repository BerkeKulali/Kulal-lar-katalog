import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { reportError } from "@/lib/report-error";
import { checkRateLimitShared } from "@/lib/rate-limit";
import { applyNetsisStock, recordNetsisSync } from "@/lib/netsis-stock-apply";

export const runtime = "nodejs";

/** İki string'i sabit sürede karşılaştırır (token sızıntısını önlemek için). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function extractBearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Otomatik Netsis stok besleme ucu (on-prem ajan buraya POST eder).
 *
 * Kimlik: `Authorization: Bearer <NETSIS_INGEST_TOKEN>`.
 * Gövde: multipart/form-data, `file` = Netsis stok dökümü (Excel/CSV).
 * `?dryRun=1` → yazmadan ne değişeceğini döndürür.
 *
 * Tüm eşleştirme/yazım/kilit mantığı admin yüklemesiyle aynı ortak servistedir.
 */
export async function POST(request: Request) {
  const expected = process.env.NETSIS_INGEST_TOKEN?.trim();
  if (!expected) {
    reportError(new Error("NETSIS_INGEST_TOKEN tanımlı değil"), {
      where: "netsis-ingest",
    });
    return NextResponse.json(
      { error: "Entegrasyon yapılandırılmamış" },
      { status: 503 }
    );
  }

  const token = extractBearer(request);
  if (!token || !safeEqual(token, expected)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  // Paylaşımlı hız sınırı: ajan çok sık vurursa koru (dk'da ~20).
  const rl = await checkRateLimitShared("netsis-ingest", {
    max: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek", retryAfterSeconds: rl.retryAfterSeconds },
      { status: 429 }
    );
  }

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const f = formData.get("file");
    if (f instanceof File) file = f;
  } catch {
    // aşağıda 400 döndürülür
  }
  if (!file) {
    return NextResponse.json(
      { error: "Dosya gerekli (multipart 'file')" },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();

  try {
    const result = await applyNetsisStock(buffer, { brandId: null, dryRun });

    if (!dryRun && result.variantsUpdated > 0) {
      invalidateCatalogCache();
    }

    await recordNetsisSync({
      source: "agent",
      fileName: file.name,
      ok: true,
      result,
    });

    return NextResponse.json(result);
  } catch (err) {
    reportError(err, { where: "netsis-ingest", fileName: file.name });
    await recordNetsisSync({
      source: "agent",
      fileName: file.name,
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "İçe aktarım sırasında hata oluştu" },
      { status: 500 }
    );
  }
}
