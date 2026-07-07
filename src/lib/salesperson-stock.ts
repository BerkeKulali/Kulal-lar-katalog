import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  SALESPERSON_TAG,
  SALESPERSON_REVALIDATE_SECONDS,
} from "@/lib/cache-tags";

async function _getSalespersonShowStock(salespersonId: string): Promise<boolean> {
  const salesperson = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    select: { showStock: true, isActive: true },
  });

  if (!salesperson?.isActive) return false;
  return salesperson.showStock;
}

const cachedShowStock = unstable_cache(
  _getSalespersonShowStock,
  ["salesperson-show-stock"],
  { tags: [SALESPERSON_TAG], revalidate: SALESPERSON_REVALIDATE_SECONDS }
);

/** Plasiyer stok görebilir mi? (pasif plasiyerler için false) */
export async function getSalespersonShowStock(
  salespersonId: string | null | undefined
): Promise<boolean> {
  if (!salespersonId) return false;
  return cachedShowStock(salespersonId);
}
