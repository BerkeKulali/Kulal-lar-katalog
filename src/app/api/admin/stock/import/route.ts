import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { hasAnyPermission } from "@/lib/admin-permissions";
import { parseNetsisBalanceRows } from "@/lib/netsis-stock-import";
import { prisma } from "@/lib/prisma";

/** Netsis stok içe aktarımında yazılan tek stok satırının etiketi. */
const NETSIS_STOCK_LABEL = "Netsis";

/**
 * Netsis stok içe aktarımı.
 *
 * Eşleşme YALNIZCA ProductVariant.netsisStockCode ile yapılır (eski `code`
 * alanı kullanılmaz). Her Netsis kodu tek bir bakiye taşır; eşleşen varyantın
 * stok satırları bu tek değere göre yeniden yazılır. Bakiye 0 ise stok 0 m²
 * olarak yazılır (satır silinmez) — böylece Netsis'te tükenen ürünler
 * katalogda da tükenmiş görünür.
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

  // netsisStockCode ile eşleşen aktif varyantlar (marka kapsamı korunur).
  const variants = await prisma.productVariant.findMany({
    where: {
      netsisStockCode: { in: codes },
      isActive: true,
      ...(admin.brandId ? { family: { brandId: admin.brandId } } : {}),
    },
    select: { id: true, netsisStockCode: true },
  });

  const variantByCode = new Map(
    variants
      .filter((v) => v.netsisStockCode)
      .map((v) => [v.netsisStockCode!.toUpperCase(), v])
  );

  for (const code of codes) {
    const variant = variantByCode.get(code);
    if (!variant) {
      results.unmatchedCodes.push(code);
      continue;
    }

    const quantityM2 = Math.round((balances.get(code) ?? 0) * 100) / 100;

    // Tek bakiye = tek stok satırı. Önceki satırları silip yeniden yazarak
    // hem eski çok-etiketli kayıtları temizler hem de 0'ı 0 olarak yazar.
    await prisma.$transaction(async (tx) => {
      await tx.stockLine.deleteMany({ where: { variantId: variant.id } });
      await tx.stockLine.create({
        data: {
          variantId: variant.id,
          label: NETSIS_STOCK_LABEL,
          quantityM2,
        },
      });
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { updatedAt: new Date() },
      });
    });

    results.variantsUpdated++;
    results.matchedCodes++;
    results.stockLinesWritten++;
    if (quantityM2 === 0) results.zeroBalanceUpdated++;
  }

  if (results.variantsUpdated > 0) {
    invalidateCatalogCache();
  }

  return NextResponse.json(results);
}
