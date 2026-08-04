import { cookies } from "next/headers";
import { DEVICE_TOKEN_COOKIE } from "@/lib/device-cookie";
import { getAuthorizedDevice } from "@/lib/device-lock";
import { getSalespersonFilterToolEnabled } from "@/lib/salesperson-stock";
import { prisma } from "@/lib/prisma";

export type FilterToolAccess =
  | { allowed: true }
  | {
      allowed: false;
      reason: "no-device" | "not-authorized" | "not-enabled";
    };

/**
 * Ürün segmenti filtre aracına cihaz (plasiyer/bayi) erişimi var mı?
 * Tek yetkili karar noktası — hem sayfa hem her API route'u bunu çağırır
 * (middleware /api/* için genel matcher'dan hariç, kendi kontrolü şart).
 *
 * Kurallar:
 * - Cihaz tokenı yok/geçersiz → izin yok.
 * - Plasiyer cihazı → Salesperson.filterToolEnabled (aktiflik dahil).
 * - Bayi cihazı (onaylı) → Device.filterToolEnabled.
 */
export async function resolveFilterToolAccess(): Promise<FilterToolAccess> {
  const token = (await cookies()).get(DEVICE_TOKEN_COOKIE)?.value;
  if (!token) {
    return { allowed: false, reason: "no-device" };
  }

  const device = await getAuthorizedDevice(token);
  if (!device) {
    return { allowed: false, reason: "not-authorized" };
  }

  if (device.salespersonId) {
    const enabled = await getSalespersonFilterToolEnabled(device.salespersonId);
    return enabled ? { allowed: true } : { allowed: false, reason: "not-enabled" };
  }

  const dealerDevice = await prisma.device.findUnique({
    where: { id: device.id },
    select: { filterToolEnabled: true },
  });
  return dealerDevice?.filterToolEnabled
    ? { allowed: true }
    : { allowed: false, reason: "not-enabled" };
}
