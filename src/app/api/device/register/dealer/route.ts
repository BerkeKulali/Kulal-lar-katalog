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
  deviceTokenCookieOptions,
} from "@/lib/device-cookie";
import { createDealerDeviceAccess } from "@/lib/device-access";
import { checkRateLimitShared, clientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = await checkRateLimitShared(`dealer-register:${clientIp(request)}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

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

    response.cookies.set(
      DEVICE_TOKEN_COOKIE,
      device.token,
      deviceTokenCookieOptions()
    );
    response.cookies.set(DEVICE_AUTH_COOKIE, device.token, {
      ...deviceTokenCookieOptions(),
      maxAge: DEVICE_AUTH_MAX_AGE,
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
