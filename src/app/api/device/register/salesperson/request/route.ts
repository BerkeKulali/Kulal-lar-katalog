import { NextResponse } from "next/server";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_REQUEST_TOKEN_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
  deviceCookieOptions,
} from "@/lib/device-cookie";
import { createSalespersonAccessRequest } from "@/lib/device-access";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const salespersonId = String(body.salespersonId ?? "").trim();
    if (!salespersonId) {
      return NextResponse.json({ error: "Plasiyer seçin" }, { status: 400 });
    }

    const created = await createSalespersonAccessRequest(salespersonId);
    const response = NextResponse.json({
      ok: true,
      requestId: created.requestId,
      status: created.status,
    });
    const opts = deviceCookieOptions();
    response.cookies.set(DEVICE_REQUEST_TOKEN_COOKIE, created.requestToken, opts);
    response.cookies.set(DEVICE_ACTOR_TYPE_COOKIE, "salesperson-pending", opts);
    response.cookies.set(DEVICE_ACTOR_NAME_COOKIE, created.salespersonName, opts);
    response.cookies.set(DEVICE_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(SALESPERSON_ID_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(SALESPERSON_NAME_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch (err) {
    console.error("POST /api/device/register/salesperson/request failed:", err);
    const message =
      err instanceof Error ? err.message : "Plasiyer talebi oluşturulamadı";
    const status = message.includes("tablette kayıtlı") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
