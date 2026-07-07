import { prisma } from "@/lib/prisma";

/** Plasiyer stok görebilir mi? (pasif plasiyerler için false) */
export async function getSalespersonShowStock(
  salespersonId: string | null | undefined
): Promise<boolean> {
  if (!salespersonId) return false;

  const salesperson = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
    select: { showStock: true, isActive: true },
  });

  if (!salesperson?.isActive) return false;
  return salesperson.showStock;
}
