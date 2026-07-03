import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  parseGuralPriceCsvRows,
  type GuralPriceColumn,
} from "@/lib/gural-import";
import { importPriceRows } from "@/lib/price-import";
import { prisma } from "@/lib/prisma";

function parsePriceColumn(value: string | null): GuralPriceColumn {
  const v = (value ?? "liste").trim().toLowerCase();
  if (v === "fabrika" || v === "depo") return v;
  return "liste";
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission("import");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  if (admin.brandId) {
    const brand = await prisma.brand.findUnique({
      where: { id: admin.brandId },
    });
    if (brand?.slug !== "gural") {
      return NextResponse.json(
        { error: "Bu işlem yalnızca GÜRAL markası için kullanılabilir" },
        { status: 403 }
      );
    }
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const mode = (formData.get("mode") as string) ?? "upsert";
  const priceColumn = parsePriceColumn(formData.get("priceColumn") as string | null);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const { rows, errors: parseErrors, skipped } = parseGuralPriceCsvRows(
    rawRows,
    priceColumn
  );

  if (rows.length === 0) {
    return NextResponse.json(
      {
        error: "İçe aktarılacak satır bulunamadı",
        errors: parseErrors,
        skipped,
        parsed: 0,
        updated: 0,
        created: 0,
      },
      { status: 400 }
    );
  }

  const results = await importPriceRows(rows, mode, admin);

  return NextResponse.json({
    ...results,
    parsed: rows.length,
    skipped,
    parseErrors,
    priceColumn,
  });
}
