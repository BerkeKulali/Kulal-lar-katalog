import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  actorTypeLabel,
  buildClickReport,
  DIMENSION_LABELS,
  parseReportFilters,
} from "@/lib/click-report";

export const dynamic = "force-dynamic";

/** Tıklanma raporunu Excel (.xlsx) olarak indirir. Yetki: families. */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;

  const { searchParams } = new URL(request.url);
  const filters = parseReportFilters(searchParams, auth.admin.brandId);
  const report = await buildClickReport(filters);

  const dims = report.dimensions;
  const header: string[] = [
    ...dims.map((d) => DIMENSION_LABELS[d]),
    ...(dims.includes("actor") ? ["Tür"] : []),
    "Tıklama",
  ];

  const aoa: (string | number)[][] = [header];
  for (const row of report.rows) {
    const cells: (string | number)[] = [];
    for (const d of dims) {
      if (d === "product") cells.push(row.product ?? "");
      else if (d === "date") cells.push(row.date ?? "");
      else if (d === "actor") cells.push(row.actor ?? "");
    }
    if (dims.includes("actor")) cells.push(actorTypeLabel(row.actorType));
    cells.push(row.count);
    aoa.push(cells);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tıklanma");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tiklanma-raporu-${stamp}.xlsx"`,
    },
  });
}
