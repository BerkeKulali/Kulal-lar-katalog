import { NextResponse } from "next/server";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_AUTH_COOKIE,
  DEVICE_AUTH_MAX_AGE,
  DEVICE_REQUEST_TOKEN_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
  deviceCookieOptions,
} from "@/lib/device-cookie";
import { createDealerDeviceAccess } from "@/lib/device-access";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const dealerName = String(body.dealerName ?? "");
    const { device, dealerName: normalizedDealerName } =
      await createDealerDeviceAccess(dealerName);

    const response = NextResponse.json({
      ok: true,
      token: device.token,
      deviceId: device.id,
    });
    const opts = deviceCookieOptions();

    response.cookies.set(DEVICE_TOKEN_COOKIE, device.token, opts);
    response.cookies.set(DEVICE_AUTH_COOKIE, device.token, {
      path: "/",
      maxAge: DEVICE_AUTH_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
    });
    response.cookies.set(DEVICE_ACTOR_TYPE_COOKIE, "dealer", opts);
    response.cookies.set(DEVICE_ACTOR_NAME_COOKIE, normalizedDealerName, opts);
    response.cookies.set(SALESPERSON_ID_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(SALESPERSON_NAME_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(DEVICE_REQUEST_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });

    return response;
  } catch (err) {
    console.error("POST /api/device/register/dealer failed:", err);
    const message =
      err instanceof Error ? err.message : "Bayi girişi oluşturulamadı";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
