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
import {
  authenticateSalesperson,
  createDeviceForSalesperson,
} from "@/lib/salesperson-account";
import { checkRateLimitShared, clearRateLimitShared, clientIp } from "@/lib/rate-limit";

// dealer/login/route.ts ile birebir aynı desen (bkz. o dosya) - farkı,
// hesabın PENDING/REJECTED durumu olmaması (admin credentials'ı atadığında
// onay zaten verilmiş sayılır, bkz. salesperson-account.ts).
const REASON_MESSAGES: Record<string, string> = {
  invalid: "Kullanıcı adı veya şifre hatalı",
  inactive: "Hesabınız devre dışı bırakılmış. Bilgi için yöneticinizle iletişime geçin",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();

  const rateKey = `salesperson-login:${clientIp(request)}:${username}`;
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

  const result = await authenticateSalesperson(username, body.password);

  if (!result.ok) {
    return NextResponse.json(
      { error: REASON_MESSAGES[result.reason] ?? "Giriş yapılamadı", reason: result.reason },
      { status: result.reason === "invalid" ? 401 : 403 }
    );
  }

  await clearRateLimitShared(rateKey, 15 * 60 * 1000);

  const device = await createDeviceForSalesperson(result.salesperson);

  const cookieStore = await cookies();
  const tokenOpts = deviceTokenCookieOptions();
  const opts = deviceCookieOptions();
  cookieStore.set(DEVICE_TOKEN_COOKIE, device.token, tokenOpts);
  cookieStore.set(DEVICE_AUTH_COOKIE, device.token, { ...tokenOpts, maxAge: DEVICE_AUTH_MAX_AGE });
  cookieStore.set(DEVICE_ACTOR_TYPE_COOKIE, "salesperson", opts);
  cookieStore.set(DEVICE_ACTOR_NAME_COOKIE, result.salesperson.name, opts);
  cookieStore.set(SALESPERSON_ID_COOKIE, result.salesperson.id, opts);
  cookieStore.set(SALESPERSON_NAME_COOKIE, result.salesperson.name, opts);
  cookieStore.set(DEVICE_REQUEST_TOKEN_COOKIE, "", { path: "/", maxAge: 0 });

  return NextResponse.json({ ok: true, salespersonName: result.salesperson.name });
}
