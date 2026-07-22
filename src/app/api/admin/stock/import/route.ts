import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { hasAnyPermission } from "@/lib/admin-permissions";
import { parseNetsisBalanceRows } from "@/lib/netsis-stock-import";
import { prisma } from "@/lib/prisma";
import { chunk } from "@/lib/utils";

/** Netsis stok içe aktarımında yazılan tek stok satırının etiketi. */
const NETSIS_STOCK_LABEL = "Netsis";

/** Turso parametre limitini aşmamak için IN sorguları bu boyutta parçalanır. */
const STOCK_CODE_QUERY_CHUNK = 100;

/**
 * Netsis stok içe aktarımı.
 *
 * Eşleşme YALNIZCA atanmış Netsis kodları (VariantNetsisCode) ile yapılır;
 * eski `code` alanı kullanılmaz. Bir varyantın birden çok kodu olabilir, bu
 * durumda bu kodların bakiyeleri toplanır ve varyantın stok satırı bu toplama
 * göre yeniden yazılır. Bakiye 0 ise stok 0 m² olarak yazılır (satır silinmez)
 * — böylece Netsis'te tükenen ürünler katalogda da tükenmiş görünür.
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

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const { balances, errors: parseErrors } = parseNetsisBalanceRows(rows);

  const results = {
    variantsUpdated: 0,
    zeroBalanceUpdated: 0,
    stockLinesWritten: 0,
    matchedCodes: 0,
    totalCodes: balances.size,
    unmatchedCodes: [] as string[],
    errors: [...parseErrors],
  };

  if (balances.size === 0) {
    return NextResponse.json(results);
  }

  const codes = [...balances.keys()];

  // Netsis kodları → varyant. Bir varyantın birden çok kodu olabilir; marka
  // kapsamı korunur. Sorgu, Turso parametre limitini aşmamak için parçalanır.
  const variantByCode = new Map<string, string>();
  for (const codeChunk of chunk(codes, STOCK_CODE_QUERY_CHUNK)) {
    const codeRows = await prisma.variantNetsisCode.findMany({
      where: {
        code: { in: codeChunk },
        variant: {
          isActive: true,
          ...(admin.brandId ? { family: { brandId: admin.brandId } } : {}),
        },
      },
      select: { code: true, variantId: true },
    });
    for (const r of codeRows) {
      variantByCode.set(r.code.toUpperCase(), r.variantId);
    }
  }

  // Bakiyeleri varyant bazında topla (aynı varyanta ait birden çok kod eklenir).
  const balanceByVariant = new Map<string, number>();
  for (const code of codes) {
    const variantId = variantByCode.get(code);
    if (!variantId) {
      results.unmatchedCodes.push(code);
      continue;
    }
    results.matchedCodes++;
    balanceByVariant.set(
      variantId,
      (balanceByVariant.get(variantId) ?? 0) + (balances.get(code) ?? 0)
    );
  }

  for (const [variantId, rawQty] of balanceByVariant) {
    const quantityM2 = Math.round(rawQty * 100) / 100;

    // Tek stok satırı. Önceki satırları silip yeniden yazarak hem eski
    // çok-etiketli kayıtları temizler hem de 0'ı 0 olarak yazar.
    await prisma.$transaction(async (tx) => {
      await tx.stockLine.deleteMany({ where: { variantId } });
      await tx.stockLine.create({
        data: { variantId, label: NETSIS_STOCK_LABEL, quantityM2 },
      });
      await tx.productVariant.update({
        where: { id: variantId },
        data: { updatedAt: new Date() },
      });
    });

    results.variantsUpdated++;
    results.stockLinesWritten++;
    if (quantityM2 === 0) results.zeroBalanceUpdated++;
  }

  if (results.variantsUpdated > 0) {
    invalidateCatalogCache();
  }

  return NextResponse.json(results);
}
