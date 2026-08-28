import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  DEVICE_ACTOR_NAME_COOKIE,
  DEVICE_ACTOR_TYPE_COOKIE,
  DEVICE_AUTH_COOKIE,
  DEVICE_TOKEN_COOKIE,
  SALESPERSON_ID_COOKIE,
  SALESPERSON_NAME_COOKIE,
} from "@/lib/device-cookie";

/**
 * Bayi kendi cihazından çıkış yapar. Yalnızca dealerId dolu (kullanıcı
 * adı/şifreyle giriş yapmış) cihazlar için çalışır - bu cihazın Device
 * kaydı silinir (bayi sınırsız cihazdan giriş yapabildiği için diğer
 * cihazları etkilenmez), sonra cookie'ler temizlenir.
 *
 * Plasiyer için BİLEREK yok: plasiyer hâlâ tek-cihaza-kilitli, şifresiz
 * modelde (bkz. device-lock.ts) - kendi kendine çıkış, admin onayı olmadan
 * aynı tabletin başka bir isimle kullanılmasına izin verirdi. Bu, mevcut
 * /api/device/reset'teki "yalnızca admin" kısıtının aynı gerekçesi.
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

  if (token) {
    const device = await prisma.device.findUnique({
      where: { token },
      select: { id: true, dealerId: true },
    });

    if (device && !device.dealerId) {
      return NextResponse.json(
        { error: "Bu işlem yalnızca bayi cihazları için kullanılabilir" },
        { status: 403 }
      );
    }

    if (device) {
      await prisma.device.delete({ where: { id: device.id } }).catch(() => {});
    }
  }

  const clear = { path: "/", maxAge: 0 };
  cookieStore.set(DEVICE_AUTH_COOKIE, "", clear);
  cookieStore.set(DEVICE_TOKEN_COOKIE, "", clear);
  cookieStore.set(SALESPERSON_ID_COOKIE, "", clear);
  cookieStore.set(SALESPERSON_NAME_COOKIE, "", clear);
  cookieStore.set(DEVICE_ACTOR_TYPE_COOKIE, "", clear);
  cookieStore.set(DEVICE_ACTOR_NAME_COOKIE, "", clear);

  return NextResponse.json({ ok: true });
}
