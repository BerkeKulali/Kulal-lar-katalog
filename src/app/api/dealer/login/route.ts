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
import { authenticateDealer, createDeviceForDealer } from "@/lib/dealer-account";
import { checkRateLimitShared, clearRateLimitShared, clientIp } from "@/lib/rate-limit";

const REASON_MESSAGES: Record<string, string> = {
  invalid: "Kullanıcı adı veya şifre hatalı",
  pending: "Hesabınız henüz admin tarafından onaylanmadı",
  rejected: "Hesap talebiniz reddedildi. Bilgi için yöneticinizle iletişime geçin",
  inactive: "Hesabınız devre dışı bırakılmış. Bilgi için yöneticinizle iletişime geçin",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();

  const rateKey = `dealer-login:${clientIp(request)}:${username}`;
  const limit = await checkRateLimitShared(rateKey, {
    max: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Çok fazla başarısız deneme. ${Math.ceil(limit.retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const result = await authenticateDealer(username, body.password);

  if (!result.ok) {
    return NextResponse.json(
      { error: REASON_MESSAGES[result.reason] ?? "Giriş yapılamadı", reason: result.reason },
      { status: result.reason === "invalid" ? 401 : 403 }
    );
  }

  await clearRateLimitShared(rateKey, 15 * 60 * 1000);

  const device = await createDeviceForDealer(result.dealer);

  const cookieStore = await cookies();
  const tokenOpts = deviceTokenCookieOptions();
  const opts = deviceCookieOptions();
  cookieStore.set(DEVICE_TOKEN_COOKIE, device.token, tokenOpts);
  cookieStore.set(DEVICE_AUTH_COOKIE, device.token, { ...tokenOpts, maxAge: DEVICE_AUTH_MAX_AGE });
  cookieStore.set(DEVICE_ACTOR_TYPE_COOKIE, "dealer", opts);
  cookieStore.set(DEVICE_ACTOR_NAME_COOKIE, result.dealer.name, opts);
  cookieStore.set(SALESPERSON_ID_COOKIE, "", { path: "/", maxAge: 0 });
  cookieStore.set(SALESPERSON_NAME_COOKIE, "", { path: "/", maxAge: 0 });
  cookieStore.set(DEVICE_REQUEST_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });

  return NextResponse.json({ ok: true, dealerName: result.dealer.name });
}
