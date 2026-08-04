import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { resolveFilterToolAccess } from "@/lib/filter-tool-access";
import {
  parseFilterCriteriaFromSearchParams,
  runProductFilter,
} from "@/lib/campaign-filter-query";
import { qualityLabel } from "@/lib/utils";
import { surfaceDisplayLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Ürün segmenti filtre sonucunu Excel (.xlsx) olarak indirir — plasiyer/onaylı bayi. */
export async function GET(request: Request) {
  const access = await resolveFilterToolAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const criteria = parseFilterCriteriaFromSearchParams(searchParams);
  if ("error" in criteria) {
    return NextResponse.json({ error: criteria.error }, { status: 400 });
  }

  const rows = await runProductFilter(criteria, { adminBrandId: null });

  const header = [
    "Marka",
    "Ürün Ailesi",
    "Ölçü",
    "Yüzey",
    "Kalite",
    "Varyant Stok (m²)",
    "Aile Toplam Stok (m²)",
  ];

  const aoa: (string | number)[][] = [header];
  for (const row of rows) {
    aoa.push([
      row.brandName,
      row.familyName,
      row.size.toUpperCase(),
      surfaceDisplayLabel(row.surface),
      qualityLabel(row.quality),
      row.stockM2,
      row.familyTotalStockM2,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ürün Segmenti");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="urun-segmenti-${stamp}.xlsx"`,
    },
  });
}
