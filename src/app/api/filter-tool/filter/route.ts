import { NextResponse } from "next/server";
import { resolveFilterToolAccess } from "@/lib/filter-tool-access";
import {
  parseFilterCriteriaFromSearchParams,
  runProductFilter,
} from "@/lib/campaign-filter-query";

export const dynamic = "force-dynamic";

/**
 * Ürün segmenti filtre önizlemesi (JSON) — plasiyer/onaylı bayi cihazları için.
 * Middleware /api/* için genel matcher'dan hariç tutulduğundan, yetki kontrolü
 * burada yapılır (bkz. resolveFilterToolAccess).
 */
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

  try {
    const rows = await runProductFilter(criteria, { adminBrandId: null });
    return NextResponse.json({ rows, total: rows.length });
  } catch (err) {
    console.error("GET /api/filter-tool/filter failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Filtre çalıştırılamadı" },
      { status: 500 }
    );
  }
}
