import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  clearSalespersonCredentials,
  setSalespersonCredentials,
} from "@/lib/salesperson-account";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Admin bir plasiyere kullanıcı adı/şifre atar (POST) ya da kaldırır
 * (DELETE) - çoklu cihaz modunu açıp kapatan tek yer (bkz. plan:
 * "Plasiyerlere çoklu cihaz girişi"). Dealer'ın kendi kendine kaydolduğu
 * signup akışının aksine, burada onay adminin credentials atamasıyla
 * zaten verilmiş sayılır.
 */
export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    const salesperson = await setSalespersonCredentials(
      id,
      body.username,
      body.password
    );
    return NextResponse.json({ ok: true, salesperson });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kullanıcı adı/şifre atanamadı";
    const status = message.includes("bulunamadı")
      ? 404
      : message.includes("zaten kullanılıyor")
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const { id } = await context.params;
  await clearSalespersonCredentials(id);
  return NextResponse.json({ ok: true });
}
