import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  setSalespersonCredentials,
  clearSalespersonCredentials,
} from "@/lib/salesperson-account";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Admin bir plasiyere kullanıcı adı/şifre atar - bu, o plasiyeri sınırsız
 * cihazdan giriş yapabildiği moda geçirir (bkz. salesperson-account.ts).
 * Plasiyerin kendi kaydolduğu bir akış YOK; kullanıcı adı/şifreyi yalnızca
 * admin belirler ve plasiyere iletir.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    const salesperson = await setSalespersonCredentials(id, body.username, body.password);
    return NextResponse.json({ ok: true, username: salesperson.username });
  } catch (err) {
    console.error(`POST /api/admin/salespeople/${id}/credentials failed:`, err);
    const message = err instanceof Error ? err.message : "Kullanıcı adı/şifre atanamadı";
    const status = message.includes("zaten kullanılıyor")
      ? 409
      : message.includes("bulunamadı")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

/** Çoklu cihaz modunu kapatır (kullanıcı adı/şifreyi temizler). */
export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;

  try {
    await clearSalespersonCredentials(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/admin/salespeople/${id}/credentials failed:`, err);
    const message = err instanceof Error ? err.message : "Kaldırılamadı";
    const status = message.includes("bulunamadı") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
