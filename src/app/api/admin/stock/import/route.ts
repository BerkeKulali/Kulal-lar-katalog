import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { hasAnyPermission } from "@/lib/admin-permissions";
import { auditLog } from "@/lib/audit";
import { reportError } from "@/lib/report-error";
import { applyNetsisStock, recordNetsisSync } from "@/lib/netsis-stock-apply";

/**
 * Netsis stok içe aktarımı (admin dosya yüklemesi).
 *
 * Eşleştirme/yazım mantığı `applyNetsisStock` ortak servisindedir; aynı mantığı
 * otomatik ajan ucu da kullanır. Manuel kilitli varyantlar korunur.
 * `?dryRun=1` → hiçbir şey yazmadan ne değişeceğini döndürür.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  if (!hasAnyPermission(admin, ["stock", "import"])) {
    return NextResponse.json(
      { error: "Bu işlem için yetkiniz yok" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();

  try {
    const result = await applyNetsisStock(buffer, {
      brandId: admin.brandId ?? null,
      dryRun,
    });

    if (!dryRun && result.variantsUpdated > 0) {
      invalidateCatalogCache();
      await auditLog(admin, {
        action: "stock.import",
        entityType: "stock",
        summary: `Netsis import: ${result.variantsUpdated} ürün güncellendi (${result.matchedCodes}/${result.totalCodes} kod, ${result.zeroBalanceUpdated} sıfır, ${result.lockedSkipped} kilitli atlandı)`,
      });
    }

    await recordNetsisSync({
      source: "manual",
      fileName: file.name,
      ok: true,
      result,
    });

    return NextResponse.json(result);
  } catch (err) {
    reportError(err, { where: "stock/import", fileName: file.name });
    await recordNetsisSync({
      source: "manual",
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
