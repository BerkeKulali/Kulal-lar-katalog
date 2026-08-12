import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  parseFilterCriteriaFromSearchParams,
  runProductFilter,
} from "@/lib/campaign-filter-query";

export const dynamic = "force-dynamic";

/** Ürün segmenti filtre önizlemesi (JSON). Yetki: campaigns. */
export async function GET(request: Request) {
  const auth = await requireAdminPermission("productFilter");
  if (!auth.admin) return auth.response;

  const { searchParams } = new URL(request.url);
  const criteria = parseFilterCriteriaFromSearchParams(searchParams);
  if ("error" in criteria) {
    return NextResponse.json({ error: criteria.error }, { status: 400 });
  }

  try {
    const rows = await runProductFilter(criteria, {
      adminBrandId: auth.admin.brandId,
    });
    return NextResponse.json({ rows, total: rows.length });
  } catch (err) {
    console.error("GET /api/admin/campaigns/filter failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Filtre çalıştırılamadı" },
      { status: 500 }
    );
  }
}
