import { prisma } from "@/lib/prisma";
import { getSalespersonShowStock } from "@/lib/salesperson-stock";
import { getDealerShowStock } from "@/lib/dealer-stock";

export type StockVisibilityInput = {
  /** Admin oturumu var mı? Admin için stok her zaman görünür. */
  isAdmin?: boolean;
  /** Plasiyer kimliği (cookie'den). Varsa Salesperson.showStock'a bakılır. */
  salespersonId?: string | null;
  /** Cihaz token'ı (cookie'den). Bayi cihazlarında Device.showStock'a bakılır. */
  deviceToken?: string | null;
};

/**
 * Katalogda stok gösterilsin mi? Tek yetkili karar noktası.
 *
 * Kurallar:
 * - Admin → her zaman görünür (kontrol/doğrulama).
 * - Plasiyer (salespersonId var) → Salesperson.showStock.
 * - Bayi (salespersonId yok, cihaz var) → Dealer.showStock (kullanıcı adı/şifre
 *   ile giriş yapılan yeni bayiler) ya da Device.showStock (eski tek-seferlik
 *   bayi cihazları), bkz. resolveFilterToolAccess ile aynı desen.
 * - Diğer → kapalı.
 */
export async function resolveStockVisibility(
  input: StockVisibilityInput
): Promise<boolean> {
  if (input.isAdmin) return true;

  if (input.salespersonId) {
    return getSalespersonShowStock(input.salespersonId);
  }

  if (input.deviceToken) {
    const device = await prisma.device.findUnique({
      where: { token: input.deviceToken },
      select: { showStock: true, dealerId: true },
    });
    if (!device) return false;
    // Kullanıcı adı/şifre ile giriş yapmış bayi cihazı: yetki Dealer'da tutulur
    // (aynı bayinin birden çok cihazı olabileceği için Device.showStock artık
    // yalnızca eski tek-seferlik bayi cihazları için geçerlidir).
    if (device.dealerId) {
      return getDealerShowStock(device.dealerId);
    }
    return device.showStock;
  }

  return false;
}
