import type { Surface } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { endPriceFromFirst } from "@/lib/prices";

type FirstVariantRef = {
  familyId: string;
  size: string;
  surface: Surface;
  price: number | null;
};

export async function syncEndPriceForFirstVariant(first: FirstVariantRef) {
  if (first.price == null || first.price <= 0) return null;

  const endPrice = endPriceFromFirst(first.price);
  const endVariant = await prisma.productVariant.findFirst({
    where: {
      familyId: first.familyId,
      size: first.size,
      surface: first.surface,
      quality: "END",
    },
    select: { id: true },
  });

  if (!endVariant) return null;

  await prisma.productVariant.update({
    where: { id: endVariant.id },
    data: { price: endPrice },
  });

  return { id: endVariant.id, price: endPrice };
}

export async function syncEndPricesForFirstVariants(
  firstVariants: FirstVariantRef[]
) {
  const synced: { id: string; price: number }[] = [];

  for (const first of firstVariants) {
    const result = await syncEndPriceForFirstVariant(first);
    if (result) synced.push(result);
  }

  return synced;
}
