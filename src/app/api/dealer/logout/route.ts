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
 * Bayi kendi cihazından çıkış yapar. Cookie temizleme HER ZAMAN çalışır -
 * bu yalnızca kullanıcının kendi tarayıcısındaki yerel oturum işaretini
 * silmektir, hiçbir güvenlik riski taşımaz. Device kaydı yalnızca gerçekten
 * bir bayi cihazıysa (dealerId dolu) silinir - bayi sınırsız cihazdan giriş
 * yapabildiği için diğer cihazları etkilenmez. dealerId boşsa (ör. bayi
 * hesapları kullanıcı adı/şifre sistemine geçmeden ÖNCE oluşturulmuş eski/
 * bozuk bir cihaz kaydıysa) Device silinmez ama cookie'ler yine de temizlenir
 * - aksi halde kullanıcı kendi bozuk oturumundan asla çıkamazdı (canlıda
 * yaşanan gerçek bir kesinti, bkz. commit geçmişi).
 *
 * Plasiyer için BİLEREK yok: plasiyer hâlâ tek-cihaza-kilitli, şifresiz
 * modelde (bkz. device-lock.ts) - kendi kendine çıkış, admin onayı olmadan
 * aynı tabletin başka bir isimle kullanılmasına izin verirdi. Bu, mevcut
 * /api/device/reset'teki "yalnızca admin" kısıtının aynı gerekçesi. (Device
 * kaydı yalnızca dealerId doluyken silindiği için bir plasiyer bu route'u
 * çağırsa bile tablet kilidi/Device kaydı bozulmaz - yalnızca kendi
 * tarayıcısındaki cookie'ler temizlenir.)
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_TOKEN_COOKIE)?.value;

  if (token) {
    const device = await prisma.device.findUnique({
      where: { token },
      select: { id: true, dealerId: true },
    });

    if (device && device.dealerId) {
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
