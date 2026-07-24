import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/report-error";
import { chunk } from "@/lib/utils";
import {
  groupBalancesByVariant,
  parseNetsisBalanceRows,
} from "@/lib/netsis-stock-import";

/** Netsis stok içe aktarımında yazılan tek stok satırının etiketi. */
export const NETSIS_STOCK_LABEL = "Netsis";

/** Turso parametre limitini aşmamak için IN sorguları bu boyutta parçalanır. */
const STOCK_CODE_QUERY_CHUNK = 100;

/**
 * Yazımlar bu boyutta transaction gruplarında yapılır. Her varyant için 3 işlem
 * (sil + yaz + updatedAt) olduğundan 50 varyant ≈ 150 ifade/transaction — Vercel
 * Hobby'nin ~10 sn fonksiyon süresine rahat sığar, tek tek transaction'a göre
 * çok daha hızlıdır.
 */
const WRITE_BATCH = 50;

/** Eşleşmeyen kod uyarısı: bu orandan fazlası eşleşmezse Sentry'ye bildirilir. */
const UNMATCHED_ALERT_RATIO = 0.5;
const UNMATCHED_ALERT_MIN_TOTAL = 20;

export type ApplyNetsisStockResult = {
  variantsUpdated: number;
  zeroBalanceUpdated: number;
  stockLinesWritten: number;
  matchedCodes: number;
  totalCodes: number;
  /** Manuel kilitli olduğu için atlanan varyant sayısı. */
  lockedSkipped: number;
  unmatchedCodes: string[];
  errors: string[];
  dryRun: boolean;
};

export type ApplyNetsisStockOptions = {
  /** Marka kapsamı (marka yöneticisi ise). null → tüm markalar. */
  brandId?: string | null;
  /** true → hiçbir şey yazma, yalnızca ne değişeceğini raporla. */
  dryRun?: boolean;
  /** true (varsayılan) → manuel kilitli varyantları atla. */
  respectLock?: boolean;
};

/**
 * Netsis stok dökümünü (Excel/CSV buffer) katalog stoğuna uygular. Admin dosya
 * yüklemesi ve otomatik ajan ucu bu ortak fonksiyonu çağırır.
 *
 * - Eşleşme YALNIZCA atanmış Netsis kodları (VariantNetsisCode) ile yapılır.
 * - Bir varyantın birden çok kodu varsa bakiyeleri toplanır.
 * - Bakiye 0 ise stok 0 m² yazılır (satır silinmez) → tükenen ürün tükenmiş görünür.
 * - Manuel kilitli (stockLocked) varyantlar atlanır (manuel değer korunur).
 */
export async function applyNetsisStock(
  buffer: ArrayBuffer,
  options: ApplyNetsisStockOptions = {}
): Promise<ApplyNetsisStockResult> {
  const { brandId = null, dryRun = false, respectLock = true } = options;

  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  // raw: false → hücreler görüntülenen metin olarak gelir. "1.241" gibi Türkçe
  // binlik ayıraçlı değerler SheetJS tarafından bozulmadan korunur.
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const { balances, errors: parseErrors } = parseNetsisBalanceRows(rows);

  const result: ApplyNetsisStockResult = {
    variantsUpdated: 0,
    zeroBalanceUpdated: 0,
    stockLinesWritten: 0,
    matchedCodes: 0,
    totalCodes: balances.size,
    lockedSkipped: 0,
    unmatchedCodes: [],
    errors: [...parseErrors],
    dryRun,
  };

  if (balances.size === 0) return result;

  const codes = [...balances.keys()];

  // Netsis kodları → varyant (marka kapsamı korunur; parçalı sorgu).
  const variantByCode = new Map<string, string>();
  for (const codeChunk of chunk(codes, STOCK_CODE_QUERY_CHUNK)) {
    const codeRows = await prisma.variantNetsisCode.findMany({
      where: {
        code: { in: codeChunk },
        variant: {
          isActive: true,
          ...(brandId ? { family: { brandId } } : {}),
        },
      },
      select: { code: true, variantId: true },
    });
    for (const r of codeRows) {
      variantByCode.set(r.code.toUpperCase(), r.variantId);
    }
  }

  // Bakiyeleri varyant bazında topla (saf fonksiyon; birim testli).
  const grouped = groupBalancesByVariant(balances, variantByCode);
  result.unmatchedCodes = grouped.unmatchedCodes;
  result.matchedCodes = grouped.matchedCodes;

  // Manuel kilitli varyantları belirle (atlanacak).
  const targetVariantIds = [...grouped.byVariant.keys()];
  const lockedSet = new Set<string>();
  if (respectLock && targetVariantIds.length > 0) {
    for (const idChunk of chunk(targetVariantIds, STOCK_CODE_QUERY_CHUNK)) {
      const locked = await prisma.productVariant.findMany({
        where: { id: { in: idChunk }, stockLocked: true },
        select: { id: true },
      });
      for (const v of locked) lockedSet.add(v.id);
    }
  }

  // Yazılacak varyantlar (kilitli olanlar atlanır).
  const writes: { variantId: string; quantityM2: number }[] = [];
  for (const [variantId, rawQty] of grouped.byVariant) {
    if (lockedSet.has(variantId)) {
      result.lockedSkipped += 1;
      continue;
    }
    writes.push({ variantId, quantityM2: Math.round(rawQty * 100) / 100 });
  }

  const tally = (quantityM2: number) => {
    result.variantsUpdated += 1;
    result.stockLinesWritten += 1;
    if (quantityM2 === 0) result.zeroBalanceUpdated += 1;
  };

  if (dryRun) {
    for (const w of writes) tally(w.quantityM2);
    return result;
  }

  // Toplu yazım: her varyant için sil+yaz+updatedAt, batch'li transaction.
  for (const batch of chunk(writes, WRITE_BATCH)) {
    await prisma.$transaction(
      batch.flatMap((w) => [
        prisma.stockLine.deleteMany({ where: { variantId: w.variantId } }),
        prisma.stockLine.create({
          data: {
            variantId: w.variantId,
            label: NETSIS_STOCK_LABEL,
            quantityM2: w.quantityM2,
          },
        }),
        prisma.productVariant.update({
          where: { id: w.variantId },
          data: { updatedAt: new Date() },
        }),
      ])
    );
    for (const w of batch) tally(w.quantityM2);
  }

  return result;
}

/**
 * Senkron sonucunu NetsisSyncLog'a yazar ve anomali durumunda (çok eşleşmeyen
 * kod) Sentry'ye uyarı iletir. Ana akışı asla bozmaz (hata yutulur).
 */
export async function recordNetsisSync(params: {
  source: "agent" | "manual";
  fileName?: string | null;
  ok: boolean;
  message?: string | null;
  result?: ApplyNetsisStockResult | null;
}): Promise<void> {
  const { source, fileName = null, ok, message = null, result = null } = params;
  const unmatched = result?.unmatchedCodes ?? [];
  try {
    await prisma.netsisSyncLog.create({
      data: {
        source,
        fileName,
        ok,
        message: message ?? null,
        dryRun: result?.dryRun ?? false,
        totalCodes: result?.totalCodes ?? 0,
        matchedCodes: result?.matchedCodes ?? 0,
        unmatchedCount: unmatched.length,
        variantsUpdated: result?.variantsUpdated ?? 0,
        lockedSkipped: result?.lockedSkipped ?? 0,
        zeroBalance: result?.zeroBalanceUpdated ?? 0,
        // İlk 50 eşleşmeyen kodu sakla (ekranda göstermek için).
        unmatchedSample:
          unmatched.length > 0
            ? JSON.stringify(unmatched.slice(0, 50))
            : null,
      },
    });
  } catch (err) {
    reportError(err, { where: "recordNetsisSync", source });
  }

  // Anomali uyarısı: başarısız senkron veya yüksek eşleşmeme oranı.
  if (!ok) {
    reportError(new Error(`Netsis senkron başarısız (${source})`), {
      where: "netsis-sync",
      source,
      message,
    });
    return;
  }
  const total = result?.totalCodes ?? 0;
  if (
    total >= UNMATCHED_ALERT_MIN_TOTAL &&
    unmatched.length / total > UNMATCHED_ALERT_RATIO
  ) {
    reportError(
      new Error(
        `Netsis senkron: ${unmatched.length}/${total} kod eşleşmedi (yüksek oran)`
      ),
      { where: "netsis-sync-unmatched", source }
    );
  }
}
