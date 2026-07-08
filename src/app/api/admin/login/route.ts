import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_AUTH_COOKIE,
  DEVICE_REQUEST_TOKEN_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "kulalilar_admin";

export async function POST(request: Request) {
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

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      {
        error: "Bu e-posta ile kayıtlı admin kullanıcısı yok",
        code: "USER_NOT_FOUND",
      },
      { status: 401 }
    );
  }
  if (user.password !== password) {
    return NextResponse.json(
      { error: "Şifre hatalı", code: "WRONG_PASSWORD" },
      { status: 401 }
    );
  }

  const cookieStore = await cookies();
  const sessionCookie = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  } as const;
  cookieStore.set(
    COOKIE_NAME,
    user.id,
    rememberDevice ? { ...sessionCookie, maxAge: 60 * 60 * 24 * 30 } : sessionCookie
  );

  // Admin "cihazı hatırla" yalnızca admin session'ı uzatır.
  // Katalog cihaz cookie'si yazılmaz; aksi durumda giriş yapılmadan katalog/admin bypass olur.
  if (rememberDevice) {
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
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
