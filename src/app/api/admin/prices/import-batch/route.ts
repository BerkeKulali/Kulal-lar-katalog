import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  createPriceImportContext,
  importPriceRowsWithContext,
  touchPriceListUpdated,
  type PriceImportRow,
} from "@/lib/price-import";

export const maxDuration = 60;

const BATCH_SIZE = 40;

export async function POST(request: Request) {
  const auth = await requireAdminPermission("import");
  if (!auth.admin) return auth.response;
  const admin = auth.admin;

  const body = (await request.json().catch(() => null)) as {
    rows?: PriceImportRow[];
    mode?: string;
    brandSlug?: string;
    batchIndex?: number;
    rowOffset?: number;
    finalize?: boolean;
  } | null;

  const rows = body?.rows ?? [];
  const mode = body?.mode ?? "upsert";
  const brandSlug = String(body?.brandSlug ?? rows[0]?.marka_slug ?? "gural")
    .trim()
    .toLowerCase();
  const rowOffset = body?.rowOffset ?? 0;
  const finalize = body?.finalize ?? false;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Satır gerekli" }, { status: 400 });
  }
  if (rows.length > BATCH_SIZE) {
    return NextResponse.json(
      { error: `En fazla ${BATCH_SIZE} satır gönderilebilir` },
      { status: 400 }
    );
  }

  const ctx = await createPriceImportContext(brandSlug, mode, admin, {
    skipEndSync: true,
  });
  if (!ctx) {
    return NextResponse.json(
      { error: "Marka bulunamadı veya yetki yok" },
      { status: 403 }
    );
  }

  const results = await importPriceRowsWithContext(rows, ctx, rowOffset);

  if (finalize) {
    await touchPriceListUpdated();
  }

  return NextResponse.json({
    ...results,
    batchIndex: body?.batchIndex ?? 0,
    processed: rows.length,
  });
}
