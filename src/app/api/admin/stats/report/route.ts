import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import { buildClickReport, parseReportFilters } from "@/lib/click-report";

export const dynamic = "force-dynamic";

/** Tıklanma raporu (JSON). Yetki: families. */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("families");
  if (!auth.admin) return auth.response;

  const { searchParams } = new URL(request.url);
  const filters = parseReportFilters(searchParams, auth.admin.brandId);

  try {
    const report = await buildClickReport(filters);
    return NextResponse.json(report);
  } catch (err) {
    console.error("GET /api/admin/stats/report failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Rapor üretilemedi" },
      { status: 500 }
    );
  }
}
