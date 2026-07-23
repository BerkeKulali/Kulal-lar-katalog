import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  ADMIN_SESSION_REMEMBER_MAX_AGE,
  createAdminSessionValue,
  isSessionSecretConfigured,
  SESSION_SECRET_MISSING,
} from "@/lib/admin-session";
import {
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_AUTH_COOKIE,
  DEVICE_REQUEST_TOKEN_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";
import { hashPassword, isHashedPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimitShared,
  clearRateLimitShared,
  clientIp,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isSessionSecretConfigured()) {
    console.error(SESSION_SECRET_MISSING);
    return NextResponse.json(
      { error: "Sunucu yapılandırması eksik; yöneticinize başvurun." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const rememberDevice = Boolean(body?.rememberDevice);

  if (!email || !password) {
    return NextResponse.json(
      { error: "E-posta ve şifre gerekli" },
      { status: 400 }
    );
  }

  const rateKey = `admin-login:${clientIp(request)}:${email}`;
  const limit = await checkRateLimitShared(rateKey, {
    max: 5,
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

  const user = await prisma.adminUser.findUnique({ where: { email } });
  // Kullanıcı yok / şifre yanlış ayrımı yapılmaz (hesap keşfini önler).
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json(
      { error: "E-posta veya şifre hatalı" },
      { status: 401 }
    );
  }

  await clearRateLimitShared(rateKey, 15 * 60 * 1000);

  // Geçiş dönemi: düz metin saklanan şifreyi ilk başarılı girişte hash'le.
  // Şifre DEĞİŞMEDİĞİ için passwordChangedAt'e dokunulmaz; aksi halde az önce
  // üretilen oturum anında geçersizleşirdi.
  if (!isHashedPassword(user.password)) {
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { password: hashPassword(password) },
    });
  }

  const maxAge = rememberDevice
    ? ADMIN_SESSION_REMEMBER_MAX_AGE
    : ADMIN_SESSION_MAX_AGE;

  const cookieStore = await cookies();
  const sessionValue = createAdminSessionValue(
    user.id,
    maxAge,
    user.passwordChangedAt
  );
  cookieStore.set(ADMIN_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  // Admin girişi katalog cihaz cookie'si YAZMAZ. Eski bir admin cihaz
  // kaydı varsa temizlenir; aksi durumda katalog/admin bypass oluşur.
  const existingActorType = cookieStore.get(DEVICE_ACTOR_TYPE_COOKIE)?.value;
  if (existingActorType === "admin") {
    const clear = { path: "/", maxAge: 0 };
    cookieStore.set(DEVICE_TOKEN_COOKIE, "", clear);
    cookieStore.set(DEVICE_AUTH_COOKIE, "", clear);
    cookieStore.set(SALESPERSON_ID_COOKIE, "", clear);
    cookieStore.set(SALESPERSON_NAME_COOKIE, "", clear);
    cookieStore.set(DEVICE_ACTOR_TYPE_COOKIE, "", clear);
    cookieStore.set(DEVICE_REQUEST_TOKEN_COOKIE, "", clear);
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    role: user.role,
    brandId: user.brandId,
  });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
