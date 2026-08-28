import { prisma } from "@/lib/prisma";
import { getAuthorizedDevice } from "@/lib/device-lock";
import { getSalespersonShowStock } from "@/lib/salesperson-stock";
import { getDealerShowStock } from "@/lib/dealer-stock";

export type StockVisibilityInput = {
  /** Admin oturumu var mı? Admin için stok her zaman görünür. */
  isAdmin?: boolean;
  /** Cihaz token'ı (httpOnly cookie'den). Kimlik BUNDAN çözülür. */
  deviceToken?: string | null;
};

/**
 * Katalogda stok gösterilsin mi? Tek yetkili karar noktası.
 *
 * Kurallar:
 * - Admin → her zaman görünür (kontrol/doğrulama).
 * - Plasiyer (cihaz token'ı bir plasiyere bağlıysa) → Salesperson.showStock.
 * - Bayi (cihaz token'ı bir bayiye bağlıysa) → Dealer.showStock (kullanıcı
 *   adı/şifre ile giriş yapılan yeni bayiler) ya da Device.showStock (eski
 *   tek-seferlik bayi cihazları).
 * - Diğer → kapalı.
 *
 * ÖNEMLİ: Kimlik yalnızca httpOnly DEVICE_TOKEN_COOKIE'den, getAuthorizedDevice
 * ile SUNUCU TARAFINDA çözülür (resolveFilterToolAccess ile aynı desen).
 * Daha önce burada ayrıca client'ın okuyup YAZABİLDİĞİ, httpOnly OLMAYAN
 * SALESPERSON_ID_COOKIE değeri doğrudan güvenilir kimlik olarak kabul
 * ediliyordu - bir müşteri tarayıcı konsolundan bu cookie'yi herhangi bir
 * plasiyer id'sine ayarlayıp, kendi cihazı hiç yetkili olmasa bile o
 * plasiyerin toptan/bayi stok görünürlüğünü açabiliyordu. getAuthorizedDevice
 * ayrıca ilgili plasiyer/bayinin hâlâ aktif/onaylı olduğunu da doğrular.
 */
export async function resolveStockVisibility(
  input: StockVisibilityInput
): Promise<boolean> {
  if (input.isAdmin) return true;
  if (!input.deviceToken) return false;

  const device = await getAuthorizedDevice(input.deviceToken);
  if (!device) return false;

  if (device.salespersonId) {
    return getSalespersonShowStock(device.salespersonId);
  }

  if (device.dealerId) {
    // Kullanıcı adı/şifre ile giriş yapmış bayi cihazı: yetki Dealer'da
    // tutulur (aynı bayinin birden çok cihazı olabileceği için
    // Device.showStock artık yalnızca eski tek-seferlik bayi cihazları
    // için geçerlidir).
    return getDealerShowStock(device.dealerId);
  }

  // Eski tek-seferlik bayi cihazı (dealerId yok, kendi showStock alanı var).
  const raw = await prisma.device.findUnique({
    where: { id: device.id },
    select: { showStock: true },
  });
  return raw?.showStock ?? false;
}
