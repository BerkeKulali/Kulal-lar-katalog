import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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
import { finalizeApprovedSalespersonRequest } from "@/lib/device-access";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const requestToken = cookieStore.get(DEVICE_REQUEST_TOKEN_COOKIE)?.value;
    if (!requestToken) {
      return NextResponse.json({ error: "Bekleyen talep bulunamadı" }, { status: 400 });
    }

    const { device, salesperson } =
      await finalizeApprovedSalespersonRequest(requestToken);

    const response = NextResponse.json({
      ok: true,
      token: device.token,
      deviceId: device.id,
      salesperson: { id: salesperson.id, name: salesperson.name },
    });
    const opts = deviceCookieOptions();
    const tokenOpts = deviceTokenCookieOptions();
    response.cookies.set(DEVICE_TOKEN_COOKIE, device.token, tokenOpts);
    response.cookies.set(DEVICE_AUTH_COOKIE, device.token, {
      ...tokenOpts,
      maxAge: DEVICE_AUTH_MAX_AGE,
    });
    response.cookies.set(SALESPERSON_ID_COOKIE, salesperson.id, opts);
    response.cookies.set(SALESPERSON_NAME_COOKIE, salesperson.name, opts);
    response.cookies.set(DEVICE_ACTOR_TYPE_COOKIE, "salesperson", opts);
    response.cookies.set(DEVICE_ACTOR_NAME_COOKIE, salesperson.name, opts);
    response.cookies.set(DEVICE_REQUEST_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });

    return response;
  } catch (err) {
    console.error("POST /api/device/register/salesperson/finalize failed:", err);
    const message =
      err instanceof Error ? err.message : "Plasiyer girişi tamamlanamadı";
    const status = message.includes("henüz onaylanmadı") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
