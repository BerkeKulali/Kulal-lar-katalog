import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DEALER_TAG, DEALER_REVALIDATE_SECONDS } from "@/lib/cache-tags";

/**
 * Kullanıcı adı/şifre ile giriş yapan bayi (Dealer) hesabının stok/filtre
 * yetkisi. salesperson-stock.ts'teki desenin birebir aynısı — onaysız/pasif
 * bayiler için her ikisi de false döner.
 */
async function _getDealerShowStock(dealerId: string): Promise<boolean> {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { showStock: true, status: true, isActive: true },
  });

  if (!dealer || dealer.status !== "APPROVED" || !dealer.isActive) return false;
  return dealer.showStock;
}

const cachedDealerShowStock = unstable_cache(
  _getDealerShowStock,
  ["dealer-show-stock"],
  { tags: [DEALER_TAG], revalidate: DEALER_REVALIDATE_SECONDS }
);

/** Bayi (kullanıcı adı/şifre hesabı) stok görebilir mi? */
export async function getDealerShowStock(
  dealerId: string | null | undefined
): Promise<boolean> {
  if (!dealerId) return false;
  return cachedDealerShowStock(dealerId);
}

async function _getDealerFilterToolEnabled(dealerId: string): Promise<boolean> {
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { filterToolEnabled: true, status: true, isActive: true },
  });

  if (!dealer || dealer.status !== "APPROVED" || !dealer.isActive) return false;
  return dealer.filterToolEnabled;
}

const cachedDealerFilterToolEnabled = unstable_cache(
  _getDealerFilterToolEnabled,
  ["dealer-filter-tool-enabled"],
  { tags: [DEALER_TAG], revalidate: DEALER_REVALIDATE_SECONDS }
);

/** Bayi (kullanıcı adı/şifre hesabı) ürün segmenti filtre aracını kullanabilir mi? */
export async function getDealerFilterToolEnabled(
  dealerId: string | null | undefined
): Promise<boolean> {
  if (!dealerId) return false;
  return cachedDealerFilterToolEnabled(dealerId);
}
