import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin-auth";
import {
  approveSalespersonAccessRequest,
  rejectSalespersonAccessRequest,
} from "@/lib/device-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("salespeople");
  if (!auth.admin) return auth.response;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "").trim().toLowerCase();
  const reason = typeof body.reason === "string" ? body.reason : undefined;
  const { id } = await context.params;

  try {
    if (action === "approve") {
      await approveSalespersonAccessRequest(id, auth.admin.id);
      return NextResponse.json({ ok: true, status: "APPROVED" });
    }
    if (action === "reject") {
      await rejectSalespersonAccessRequest(id, auth.admin.id, reason);
      return NextResponse.json({ ok: true, status: "REJECTED" });
    }
    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Talep güncellenemedi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
