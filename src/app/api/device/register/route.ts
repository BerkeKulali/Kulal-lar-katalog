import { NextResponse } from "next/server";
import {
  DEVICE_AUTH_COOKIE,
  DEVICE_AUTH_MAX_AGE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
  deviceCookieOptions,
} from "@/lib/device-cookie";
import { registerTabletForSalesperson } from "@/lib/device-lock";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { salespersonId } = body;

    if (!salespersonId) {
      return NextResponse.json({ error: "Plasiyer gerekli" }, { status: 400 });
    }

    const { device, salesperson } =
      await registerTabletForSalesperson(salespersonId);

    const response = NextResponse.json({
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
    response.cookies.set(SALESPERSON_ID_COOKIE, salesperson.id, opts);
    response.cookies.set(SALESPERSON_NAME_COOKIE, salesperson.name, opts);

    return response;
  } catch (err) {
    console.error("POST /api/device/register failed:", err);
    const message =
      err instanceof Error ? err.message : "Tablet kaydı oluşturulamadı";
    const status = message.includes("tablette kayıtlı") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
