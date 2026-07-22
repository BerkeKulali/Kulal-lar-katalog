import { prisma } from "@/lib/prisma";
import { getSalespersonShowStock } from "@/lib/salesperson-stock";

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
 * - Bayi (salespersonId yok, cihaz var) → Device.showStock (varsayılan kapalı).
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
      select: { showStock: true },
    });
    return device?.showStock ?? false;
  }

  return false;
}
