import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  parseGuralPriceCsvRows,
  type GuralPriceColumn,
} from "@/lib/gural-import";

export const maxDuration = 60;

function parsePriceColumn(value: string | null): GuralPriceColumn {
  const v = (value ?? "liste").trim().toLowerCase();
  if (v === "fabrika" || v === "depo") return v;
  return "liste";
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission("import");
  if (!auth.admin) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file");
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
        parseErrors,
        skipped,
        total: 0,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    rows,
    parseErrors,
    skipped,
    total: rows.length,
    priceColumn,
  });
}
