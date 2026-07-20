import { prisma } from "@/lib/prisma";

/**
 * Cihazın "son görülme" zamanını günceller.
 *
 * Tek koşullu yazım kullanır: kayıt yeterince eskiyse yazar, değilse hiç
 * dokunmaz. Böylece her istekte gereksiz yazım oluşmaz. Serverless'te
 * fire-and-forget yazımlar düşebildiği için çağıran tarafın await etmesi
 * beklenir; hata durumunda asıl isteği bloklamaz.
 */
export const DEVICE_LAST_SEEN_THROTTLE_MS = 10 * 60 * 1000;

export async function touchDevice(
  deviceToken: string | undefined | null,
  options: { force?: boolean; throttleMs?: number } = {}
): Promise<void> {
  if (!deviceToken) return;

  const throttleMs = options.throttleMs ?? DEVICE_LAST_SEEN_THROTTLE_MS;
  const now = new Date();

  try {
    await prisma.device.updateMany({
      where: {
        token: deviceToken,
        ...(options.force
          ? {}
          : { lastSeenAt: { lt: new Date(now.getTime() - throttleMs) } }),
      },
      data: { lastSeenAt: now },
    });
  } catch {
    // Takip güncellemesi kritik değil; çağıran akışı bloklamaz.
  }
}
