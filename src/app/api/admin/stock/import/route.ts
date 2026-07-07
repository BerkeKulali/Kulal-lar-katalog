import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateCatalogCache } from "@/lib/cache-tags";
import { hasAnyPermission } from "@/lib/admin-permissions";
import {
  aggregateStockRows,
  parseNetsisStockRows,
} from "@/lib/netsis-stock-import";
import { prisma } from "@/lib/prisma";

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
  const mode = (formData.get("mode") as string) ?? "replace";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const { parsed, errors: parseErrors } = parseNetsisStockRows(rows);
  const aggregated = aggregateStockRows(parsed);

  const results = {
    variantsUpdated: 0,
    stockLinesWritten: 0,
    skippedCodes: [] as string[],
    errors: [...parseErrors],
  };

  const codes = [...aggregated.keys()];
  if (codes.length === 0) {
    return NextResponse.json(results);
  }

  const variants = await prisma.productVariant.findMany({
    where: {
      code: { in: codes },
      isActive: true,
      ...(admin.brandId ? { family: { brandId: admin.brandId } } : {}),
    },
    select: { id: true, code: true },
  });

  const variantByCode = new Map(
    variants
      .filter((v) => v.code)
      .map((v) => [v.code!.toUpperCase(), v])
  );

  for (const code of codes) {
    const variant = variantByCode.get(code);
    if (!variant) {
      results.skippedCodes.push(code);
      continue;
    }

    const labelMap = aggregated.get(code)!;
    const lines = [...labelMap.entries()].map(([label, quantityM2]) => ({
      label,
      quantityM2: Math.round(quantityM2 * 100) / 100,
    }));

    await prisma.$transaction(async (tx) => {
      if (mode === "replace") {
        await tx.stockLine.deleteMany({ where: { variantId: variant.id } });
        await tx.stockLine.createMany({
          data: lines.map((line) => ({
            variantId: variant.id,
            label: line.label,
            quantityM2: line.quantityM2,
          })),
        });
      } else {
        for (const line of lines) {
          const existing = await tx.stockLine.findFirst({
            where: { variantId: variant.id, label: line.label },
          });
          if (existing) {
            await tx.stockLine.update({
              where: { id: existing.id },
              data: { quantityM2: line.quantityM2 },
            });
          } else {
            await tx.stockLine.create({
              data: {
                variantId: variant.id,
                label: line.label,
                quantityM2: line.quantityM2,
              },
            });
          }
        }
      }

      await tx.productVariant.update({
        where: { id: variant.id },
        data: { updatedAt: new Date() },
      });
    });

    results.variantsUpdated++;
    results.stockLinesWritten += lines.length;
  }

  if (results.variantsUpdated > 0) {
    invalidateCatalogCache();
  }

  return NextResponse.json(results);
}
